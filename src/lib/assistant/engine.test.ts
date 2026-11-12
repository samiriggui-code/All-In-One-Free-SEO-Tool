import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiApprovals, clientContext, clients } from "@/db/schema";

/** Scripted model: each call returns the next reply, and keeps what it was sent. */
const script: string[] = [];
const seen: { messages: { role: string; content: string }[]; system: string }[] = [];
vi.mock("@/lib/ai-call", () => ({
  callAIResult: async (o: { messages: { role: string; content: string }[]; system: string }) => {
    seen.push({ messages: o.messages.map((m) => ({ ...m })), system: o.system });
    const text = script.shift();
    return text === undefined
      ? { ok: false, failure: { message: "no more script" } }
      : { ok: true, text, provider: "openai", model: "test" };
  },
  embedTexts: async () => ({ ok: false }),
}));

const { parseToolCall, toolCatalog } = await import("./protocol");
const { runAssistant, decideApproval, assistantTools } = await import("./engine");
const { upsertDocument } = await import("@/lib/kb/store");

describe("tool call protocol", () => {
  it("reads a tool call, with or without the tags", () => {
    expect(parseToolCall('<tool_call>{"name":"list_clients","arguments":{}}</tool_call>')).toEqual({
      name: "list_clients",
      args: {},
    });
    expect(parseToolCall('```json\n{"name":"get_client_overview","arguments":{"clientId":3}}\n```')).toEqual({
      name: "get_client_overview",
      args: { clientId: 3 },
    });
    expect(parseToolCall("Votre score est de 72/100.")).toBeNull();
    expect(parseToolCall("<tool_call>pas du json</tool_call>")).toBeNull();
  });

  it("lists every MCP tool plus knowledge search, and marks the ones that change data", () => {
    const tools = assistantTools();
    expect(tools.map((t) => t.name)).toContain("search_knowledge");
    expect(tools.length).toBeGreaterThanOrEqual(23);
    const catalog = toolCatalog(tools);
    expect(catalog).toMatch(/apply_fix\(fixId: number, newValue: string\) \[CHANGES DATA/);
    expect(catalog).not.toMatch(/list_clients\(\) \[CHANGES DATA/);
  });
});

describe("assistant loop", () => {
  let clientId = 0;
  beforeAll(async () => {
    clientId = (await db.insert(clients).values({ name: "Fournil Test", url: "https://fournil.example" }).returning({ id: clients.id }))[0].id;
    await upsertDocument({
      clientId,
      sourceType: "note",
      sourceId: "horaires",
      title: "Horaires",
      text: "# Horaires\n\nLa boutique est fermée le lundi.",
    });
  });

  it("looks up the knowledge base, then answers from it", async () => {
    seen.length = 0;
    script.push(
      `<tool_call>{"name":"search_knowledge","arguments":{"clientId":${clientId},"query":"fermée lundi"}}</tool_call>`,
      "La boutique est fermée le lundi.",
    );
    const r = await runAssistant([{ role: "user", content: "Quand est-ce fermé ?" }], { user: null, clientId, locale: "fr" });
    expect(r.ok && r.reply).toBe("La boutique est fermée le lundi.");
    expect(r.steps).toEqual([{ tool: "search_knowledge", ok: true }]);
    // The second call carried the tool result, and the page's client is named.
    const last = seen[1].messages.at(-1)!;
    expect(last.role).toBe("user");
    expect(last.content).toContain('<tool_result name="search_knowledge">');
    expect(last.content).toContain("fermée le lundi");
    expect(seen[0].system).toContain("Fournil Test");
  });

  it("reports an unknown tool back to the model instead of failing", async () => {
    script.push('<tool_call>{"name":"delete_everything","arguments":{}}</tool_call>', "Je ne peux pas faire ça.");
    const r = await runAssistant([{ role: "user", content: "Supprime tout" }], { user: null });
    expect(r.ok && r.reply).toBe("Je ne peux pas faire ça.");
    expect(r.steps).toEqual([{ tool: "delete_everything", ok: false }]);
  });

  it("turns a change into a proposal, and runs it only once confirmed", async () => {
    script.push(
      `<tool_call>{"name":"update_client_knowledge","arguments":{"clientId":${clientId},"audience":"Familles du quartier"}}</tool_call>`,
    );
    const r = await runAssistant([{ role: "user", content: "Note que le public, ce sont les familles du quartier" }], {
      user: null,
      clientId,
    });
    expect(r.ok).toBe(true);
    if (!r.ok || !r.pending) throw new Error("expected a proposal");
    expect(r.pending.tool).toBe("update_client_knowledge");
    expect(r.pending.summary).toContain("Familles du quartier");

    // Nothing written yet.
    const before = await db.select().from(clientContext).where(eq(clientContext.clientId, clientId));
    expect(before[0]?.audience ?? null).toBeNull();

    const done = await decideApproval(r.pending.id, true);
    expect(done.ok).toBe(true);
    const after = await db.select().from(clientContext).where(eq(clientContext.clientId, clientId));
    expect(after[0]?.audience).toBe("Familles du quartier");

    // A second click does nothing.
    expect(await decideApproval(r.pending.id, true)).toEqual({ ok: false, error: "already_decided" });
    const [row] = await db.select().from(aiApprovals).where(eq(aiApprovals.id, r.pending.id));
    expect(row.status).toBe("approved");
  });

  it("creates a task only after confirmation", async () => {
    script.push(
      `<tool_call>{"name":"create_task","arguments":{"clientId":${clientId},"title":"Raccourcir les titres","priority":"high","dueDate":"2026-12-01"}}</tool_call>`,
    );
    const r = await runAssistant([{ role: "user", content: "Crée une tâche pour corriger les titres trop longs" }], { user: null });
    if (!r.ok || !r.pending) throw new Error("expected a proposal");
    const { tasks } = await import("@/db/schema");
    expect((await db.select().from(tasks).where(eq(tasks.clientId, clientId))).length).toBe(0);
    expect((await decideApproval(r.pending.id, true)).ok).toBe(true);
    const rows = await db.select().from(tasks).where(eq(tasks.clientId, clientId));
    expect(rows.map((t) => [t.title, t.priority])).toEqual([["Raccourcir les titres", "high"]]);
  });

  it("records a refusal without running anything", async () => {
    script.push(
      `<tool_call>{"name":"update_client_knowledge","arguments":{"clientId":${clientId},"notes":"à ne pas écrire"}}</tool_call>`,
    );
    const r = await runAssistant([{ role: "user", content: "Ajoute une note" }], { user: null });
    if (!r.ok || !r.pending) throw new Error("expected a proposal");
    expect(await decideApproval(r.pending.id, false)).toEqual({ ok: true, status: "rejected" });
    const after = await db.select().from(clientContext).where(eq(clientContext.clientId, clientId));
    expect(after[0]?.notes ?? null).toBeNull();
  });

  it("stops after a few lookups", async () => {
    for (let i = 0; i < 6; i++) script.push('<tool_call>{"name":"list_clients","arguments":{}}</tool_call>');
    const r = await runAssistant([{ role: "user", content: "?" }], { user: null });
    expect(r).toMatchObject({ ok: false, error: "too_many_steps" });
    script.length = 0;
  });
});
