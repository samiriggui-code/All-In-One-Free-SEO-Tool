import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { setSetting, deleteSetting } from "@/lib/settings-store";

const script: string[] = [];
const seen: string[] = [];
vi.mock("@/lib/ai-call", () => ({
  callAIResult: async (o: { system: string }) => {
    seen.push(o.system);
    const text = script.shift();
    return text === undefined ? { ok: false, failure: { message: "end" } } : { ok: true, text, provider: "openai" };
  },
  embedTexts: async () => ({ ok: false }),
}));

const mem = await import("./memory");
const { runAssistant } = await import("./engine");

describe("assistant memory", () => {
  it("remembers when asked, and a new conversation is told", async () => {
    const clientId = (await db.insert(clients).values({ name: "ND Test", url: "https://nd.example" }).returning({ id: clients.id }))[0].id;
    script.push(
      `<tool_call>{"name":"remember","arguments":{"scope":"client","clientId":${clientId},"text":"ND Test vouvoie ses clients.","category":"instruction"}}</tool_call>`,
      "C'est noté.",
    );
    const r = await runAssistant([{ role: "user", content: "Retiens que ND Test vouvoie ses clients" }], { user: null, clientId });
    expect(r.ok && r.reply).toBe("C'est noté.");

    // A new conversation about that client carries it in the prompt.
    seen.length = 0;
    script.push("Bonjour, que puis-je pour vous ?");
    await runAssistant([{ role: "user", content: "Écris un brief" }], { user: null, clientId });
    expect(seen[0]).toContain("ND Test vouvoie ses clients.");
    // ...but not one about another client.
    seen.length = 0;
    script.push("ok");
    await runAssistant([{ role: "user", content: "Bonjour" }], { user: null, clientId: null });
    expect(seen[0]).not.toContain("vouvoie");
  });

  it("does not add the same sentence twice, nor a refused one again", async () => {
    const a = await mem.addMemory(null, { scope: "team", text: "Rapports le lundi.", category: "fact", status: "pending", source: "auto" });
    if (!a.ok) throw new Error("add failed");
    expect((await mem.changeMemory(null, a.id, { status: "rejected" })).ok).toBe(true);
    const again = await mem.addMemory(null, { scope: "team", text: "rapports le lundi", status: "pending", source: "auto" });
    expect(again).toEqual({ ok: true, id: a.id, duplicate: true });
    // Refused and pending memories never reach the model.
    expect(await mem.memoryPrompt(null, null)).not.toContain("Rapports le lundi");
  });

  it("puts the agency charter first, and respects the personal switch", async () => {
    await setSetting("ai.charter", "Ne jamais promettre de position.");
    await mem.addMemory(null, { scope: "user", text: "Je préfère les listes à puces.", category: "preference" });
    const p = await mem.memoryPrompt(null, null);
    expect(p.indexOf("Ne jamais promettre")).toBeLessThan(p.indexOf("listes à puces"));
    await deleteSetting("ai.charter");
  });

  it("refuses a memory over 500 characters and edits mark it as changed by hand", async () => {
    expect(await mem.addMemory(null, { scope: "user", text: "x".repeat(501) })).toEqual({ ok: false, error: "too_long" });
    const a = await mem.addMemory(null, { scope: "user", text: "Réponses courtes." });
    if (!a.ok) throw new Error();
    await mem.changeMemory(null, a.id, { text: "Réponses très courtes." });
    const m = await mem.getMemory(a.id);
    expect([m?.text, m?.edited]).toEqual(["Réponses très courtes.", true]);
    expect((await mem.removeMemory(null, a.id)).ok).toBe(true);
  });

  it("proposes memories to confirm in automatic mode only, and never a refused one again", async () => {
    const exchange = { userMessage: "Pour mes rapports, je veux toujours un résumé en trois points.", reply: "D'accord." };
    expect(await mem.extractMemories(null, null, exchange)).toBe(0); // on request by default
    await setSetting("memory.mode", "auto");
    script.push('Voici : [{"text":"Résumé des rapports en trois points.","scope":"me","category":"preference"}]');
    expect(await mem.extractMemories(null, null, exchange)).toBe(1);
    const rows = (await mem.listVisibleMemories(null)).filter((m) => m.text === "Résumé des rapports en trois points.");
    expect(rows.map((m) => [m.status, m.source])).toEqual([["pending", "auto"]]);
    // Pending is not used.
    expect(await mem.memoryPrompt(null, null)).not.toContain("trois points");
    await mem.changeMemory(null, rows[0].id, { status: "rejected" });
    script.push('[{"text":"Résumé des rapports en trois points.","scope":"me","category":"preference"}]');
    expect(await mem.extractMemories(null, null, exchange)).toBe(0);
    await deleteSetting("memory.mode");
  });

  it("reads only a well-formed JSON array", () => {
    expect(mem.parseExtracted("[]")).toEqual([]);
    expect(mem.parseExtracted("rien à retenir")).toEqual([]);
    expect(mem.parseExtracted('[{"text":"court"}]')).toEqual([]);
    expect(mem.parseExtracted('[{"text":"Le client vise les familles.","scope":"client","category":"bogus"}]')).toEqual([
      { text: "Le client vise les familles.", scope: "client", category: "fact" },
    ]);
  });
});
