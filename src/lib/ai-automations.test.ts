import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiApprovals, automationRuns, automations, clients, kbDocuments } from "@/db/schema";

const script: string[] = [];
vi.mock("@/lib/ai-call", () => ({
  callAIResult: async () => {
    const text = script.shift();
    return text === undefined ? { ok: false, failure: { message: "provider down" } } : { ok: true, text, provider: "openai" };
  },
  embedTexts: async () => ({ ok: false }),
}));

const { nextRunAfter, runAutomationAiSteps, tickAiAutomations, MAX_FAILURES } = await import("./ai-automations");

describe("schedule", () => {
  it("finds the next slot in the automation's time zone", () => {
    const thu = new Date("2026-11-12T10:00:00Z"); // Thursday, 11:00 in Paris (UTC+1)
    expect(nextRunAfter({ every: "daily", hour: 8, tz: "Europe/Paris" }, thu).toISOString()).toBe("2026-11-13T07:00:00.000Z");
    expect(nextRunAfter({ every: "daily", hour: 12, tz: "Europe/Paris" }, thu).toISOString()).toBe("2026-11-12T11:00:00.000Z");
    expect(nextRunAfter({ every: "weekly", day: 1, hour: 8, tz: "Europe/Paris" }, thu).toISOString()).toBe("2026-11-16T07:00:00.000Z");
    expect(nextRunAfter({ every: "monthly", day: 1, hour: 8, tz: "Europe/Paris" }, thu).toISOString()).toBe("2026-12-01T07:00:00.000Z");
    // Summer time: Paris is UTC+2.
    expect(nextRunAfter({ every: "daily", hour: 8, tz: "Europe/Paris" }, new Date("2026-07-01T00:00:00Z")).toISOString()).toBe(
      "2026-07-01T06:00:00.000Z",
    );
  });
});

async function makeAutomation(clientId: number | null, deliverable: "note" | "task" | "log" = "note") {
  const [a] = await db
    .insert(automations)
    .values({
      name: "Veille test",
      trigger: "schedule",
      clientId,
      actions: [{ kind: "ai_step", prompt: "Fais la veille de la semaine.", deliverable }],
      schedule: { every: "weekly", day: 1, hour: 8, tz: "Europe/Paris" },
      nextRunAt: new Date("2026-01-05T07:00:00Z"), // weeks overdue
      enabled: true,
    })
    .returning();
  return a;
}

describe("AI step", () => {
  it("reads with tools, delivers a note, and records the run", async () => {
    const clientId = (await db.insert(clients).values({ name: "Veille SA", url: "https://veille.example" }).returning({ id: clients.id }))[0].id;
    const a = await makeAutomation(clientId);
    script.push(
      `<tool_call>{"name":"get_client_overview","arguments":{"clientId":${clientId}}}</tool_call>`,
      "Semaine calme : pas d'audit encore (source : get_client_overview).",
    );
    const r = await runAutomationAiSteps(a, "manual");
    expect(r).toEqual({ runs: 1, failed: 0 });
    const [run] = await db.select().from(automationRuns).where(eq(automationRuns.automationId, a.id));
    expect(run.status).toBe("ok");
    expect(run.steps).toEqual([{ tool: "get_client_overview", ok: true }]);
    const notes = await db.select().from(kbDocuments).where(eq(kbDocuments.clientId, clientId));
    expect(notes.some((n) => n.title.startsWith("Veille test ·"))).toBe(true);
  });

  it("never runs or proposes a change on its own", async () => {
    const clientId = (await db.insert(clients).values({ name: "Lecture seule", url: "https://ro.example" }).returning({ id: clients.id }))[0].id;
    const a = await makeAutomation(clientId, "log");
    const before = (await db.select().from(aiApprovals)).length;
    script.push(
      `<tool_call>{"name":"create_task","arguments":{"clientId":${clientId},"title":"x"}}</tool_call>`,
      "Je recommande de créer une tâche pour corriger les titres.",
    );
    const r = await runAutomationAiSteps(a, "manual");
    expect(r.failed).toBe(0);
    expect((await db.select().from(aiApprovals)).length).toBe(before);
    const [run] = await db.select().from(automationRuns).where(eq(automationRuns.automationId, a.id));
    expect(run.steps).toEqual([{ tool: "create_task", ok: false }]);
  });

  it("pauses itself after 3 failed runs in a row", async () => {
    const clientId = (await db.insert(clients).values({ name: "Panne", url: "https://panne.example" }).returning({ id: clients.id }))[0].id;
    let a = await makeAutomation(clientId);
    for (let i = 0; i < MAX_FAILURES; i++) {
      const r = await runAutomationAiSteps(a, "manual"); // script empty: provider down
      expect(r.failed).toBe(1);
      [a] = await db.select().from(automations).where(eq(automations.id, a.id));
    }
    expect(a.failures).toBe(MAX_FAILURES);
    expect(a.enabled).toBe(false);
  });

  it("runs an overdue schedule once and moves it to the next slot", async () => {
    const clientId = (await db.insert(clients).values({ name: "Retard", url: "https://retard.example" }).returning({ id: clients.id }))[0].id;
    // Only this automation is due and enabled among the ones we created.
    await db.update(automations).set({ enabled: false });
    const a = await makeAutomation(clientId);
    script.push("Rien à signaler.");
    const now = new Date("2026-11-12T10:00:00Z");
    const r = await tickAiAutomations(now);
    expect(r).toMatchObject({ automations: 1, runs: 1, failed: 0 });
    const [after] = await db.select().from(automations).where(eq(automations.id, a.id));
    expect(after.nextRunAt?.toISOString()).toBe("2026-11-16T07:00:00.000Z");
    expect((await tickAiAutomations(now)).automations).toBe(0);
  });
});
