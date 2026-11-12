/**
 * IA-5: the AI step of an automation.
 *
 * The assistant (lib/assistant/engine.ts) works on the automation's
 * prompt for one client with read-only tools, and its answer becomes
 * the deliverable: a task, a note in the client's knowledge base, a
 * webhook message or a journal line. It never changes the client's site
 * or data on its own; a change it would want is written in its answer
 * for a person to act on.
 *
 * Limits: 10 minutes per run, the monthly AI cap (callAI), and an
 * automation that fails 3 times in a row pauses itself. A scheduled
 * automation that missed several runs (server off) runs once, not once
 * per missed slot.
 */

import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  automationRuns,
  automations,
  clients,
  tasks,
  type AutomationAction,
  type AutomationSchedule,
} from "@/db/schema";
import { logActivity } from "./activity";

export const RUN_TIMEOUT_MS = 10 * 60_000;
export const MAX_FAILURES = 3;

type AiStep = Extract<AutomationAction, { kind: "ai_step" }>;
type AutomationRow = typeof automations.$inferSelect;

/* ---------------------------------------------------------------- schedule */

/** Offset of a time zone from UTC at a given instant, in ms. */
function tzOffset(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(at));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")) - at;
}

/** The UTC instant of a local wall-clock time in `tz`. */
function zoned(y: number, m: number, d: number, hour: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d, hour);
  const first = guess - tzOffset(guess, tz);
  return guess - tzOffset(first, tz);
}

function localDate(at: number, tz: string): { y: number; m: number; d: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), weekday: wd };
}

export function validTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The next run strictly after `from`. */
export function nextRunAfter(s: AutomationSchedule, from: Date): Date {
  const tz = validTimeZone(s.tz) ? s.tz : "Europe/Paris";
  const hour = Math.max(0, Math.min(23, Math.floor(s.hour)));
  for (let i = 0; i <= 62; i++) {
    const day = localDate(from.getTime() + i * 86_400_000, tz);
    if (s.every === "weekly" && day.weekday !== (s.day ?? 1)) continue;
    if (s.every === "monthly" && day.d !== Math.max(1, Math.min(28, s.day ?? 1))) continue;
    const at = zoned(day.y, day.m, day.d, hour, tz);
    if (at > from.getTime()) return new Date(at);
  }
  return new Date(from.getTime() + 86_400_000);
}

/* ---------------------------------------------------------------- running */

function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (data[k] === undefined || data[k] === null ? "" : String(data[k])));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${Math.round(ms / 60_000)} min`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function deliver(
  automation: AutomationRow,
  step: AiStep,
  clientId: number | null,
  runId: number,
  output: string,
): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const title = `${automation.name} · ${day}`;
  if (step.deliverable === "task" && clientId) {
    await db.insert(tasks).values({
      clientId,
      title: title.slice(0, 200),
      description: output.slice(0, 8000),
      whyItMatters: `Automatisation « ${automation.name} »`,
      priority: "medium",
      status: "todo",
    });
    return;
  }
  if (step.deliverable === "note" && clientId) {
    const { upsertDocument } = await import("./kb/store");
    await upsertDocument({
      clientId,
      sourceType: "note",
      sourceId: `automation-${automation.id}-run-${runId}`,
      title,
      text: `# ${title}\n\n${output}`,
      manual: true,
    });
    return;
  }
  if (step.deliverable === "webhook" && step.webhookUrl) {
    const { sendToWebhook } = await import("./notifier");
    await sendToWebhook(step.webhookUrl, { title, body: output.slice(0, 3500), level: "info" });
    return;
  }
  await logActivity({ kind: "automation.ai_step", message: `${title}\n\n${output.slice(0, 1500)}`, clientId });
}

/**
 * Run one automation's AI step for one client (or for the whole agency
 * when clientId is null), record it, deliver the answer.
 */
export async function runAiStep(
  automation: AutomationRow,
  step: AiStep,
  clientId: number | null,
  trigger: string,
  data: Record<string, unknown> = {},
): Promise<{ ok: boolean; runId: number; output?: string; error?: string }> {
  const [run] = await db
    .insert(automationRuns)
    .values({ automationId: automation.id, clientId, trigger, status: "running" })
    .returning({ id: automationRuns.id });

  let ok = false;
  let output: string | undefined;
  let error: string | undefined;
  let steps: { tool: string; ok: boolean }[] = [];
  try {
    const { runAssistant } = await import("./assistant/engine");
    const event = Object.keys(data).length
      ? `\n\nEvent that started this run (${trigger}):\n${Object.entries(data)
          .map(([k, v]) => `- ${k}: ${String(v ?? "")}`)
          .join("\n")}`
      : "";
    const res = await withTimeout(
      runAssistant([{ role: "user", content: `${interpolate(step.prompt, data)}${event}` }], {
        user: null,
        clientId,
        actor: "automation",
        readOnly: true,
        locale: "fr",
        extraSystem: `You are running unattended, for the automation "${automation.name}". Nobody will answer questions: look up what you need with the tools, then write the final deliverable for the agency team (${step.deliverable === "task" ? "a task description" : step.deliverable === "note" ? "a note for the client's knowledge base" : "a short message"}). Say where each figure comes from. If the data is missing, say so plainly instead of guessing.`,
      }),
      RUN_TIMEOUT_MS,
    );
    steps = res.steps;
    if (res.ok && res.reply.trim()) {
      output = res.reply.trim();
      await deliver(automation, step, clientId, run.id, output);
      ok = true;
    } else {
      error = res.ok ? "empty answer" : res.error;
    }
  } catch (err) {
    error = (err as Error).message;
  }

  await db
    .update(automationRuns)
    .set({ status: ok ? "ok" : "error", output: output ?? null, error: error ?? null, steps, finishedAt: new Date() })
    .where(eq(automationRuns.id, run.id));
  return { ok, runId: run.id, output, error };
}

/** Run every AI step of an automation for its clients, then count failures. */
export async function runAutomationAiSteps(
  automation: AutomationRow,
  trigger: string,
  opts: { clientId?: number | null; data?: Record<string, unknown> } = {},
): Promise<{ runs: number; failed: number }> {
  const stepsList = automation.actions.filter((a): a is AiStep => a.kind === "ai_step");
  if (stepsList.length === 0) return { runs: 0, failed: 0 };

  // A scheduled automation "for all clients" runs once per client.
  let targets: (number | null)[];
  if (opts.clientId !== undefined) targets = [opts.clientId];
  else if (automation.clientId !== null) targets = [automation.clientId];
  else targets = (await db.select({ id: clients.id }).from(clients)).map((c) => c.id);

  let runs = 0;
  let failed = 0;
  for (const clientId of targets) {
    for (const step of stepsList) {
      const r = await runAiStep(automation, step, clientId, trigger, opts.data);
      runs++;
      if (!r.ok) failed++;
    }
  }

  const failures = failed === 0 ? 0 : (automation.failures ?? 0) + 1;
  const pause = failures >= MAX_FAILURES;
  await db
    .update(automations)
    .set({ failures, enabled: pause ? false : automation.enabled, updatedAt: new Date() })
    .where(eq(automations.id, automation.id));
  if (pause) {
    await logActivity({
      kind: "automation.paused",
      level: "warning",
      message: `Automatisation « ${automation.name} » mise en pause après ${MAX_FAILURES} échecs de suite.`,
      clientId: automation.clientId,
    });
  }
  return { runs, failed };
}

/** Scheduler entry: every scheduled automation that is due. */
export async function tickAiAutomations(now = new Date()): Promise<{ automations: number; runs: number; failed: number }> {
  const due = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.trigger, "schedule"),
        eq(automations.enabled, true),
        or(isNull(automations.nextRunAt), lte(automations.nextRunAt, now)),
      ),
    );
  let runs = 0;
  let failed = 0;
  for (const a of due) {
    // Set the next slot first, from now: missed slots collapse into this one run.
    const next = a.schedule ? nextRunAfter(a.schedule, now) : new Date(now.getTime() + 86_400_000);
    await db
      .update(automations)
      .set({ nextRunAt: next, lastRunAt: now, runCount: (a.runCount ?? 0) + 1 })
      .where(eq(automations.id, a.id));
    const r = await runAutomationAiSteps(a, "schedule");
    runs += r.runs;
    failed += r.failed;
  }
  return { automations: due.length, runs, failed };
}
