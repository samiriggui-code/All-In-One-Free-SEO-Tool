"use server";

import { actionTx } from "@/lib/action-tx";
import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import {
  reverseEngineerCompetitor,
  type CompetitorPlaybook,
} from "@/lib/competitor-playbook";

const inputSchema = z.object({
  competitorUrl: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  myUrl: z
    .string()
    .trim()
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  country: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type PlaybookState =
  | { ok: true; playbook: CompetitorPlaybook }
  | { ok: false; error: string };

export async function runCompetitorAnalysis(
  _prev: PlaybookState | null,
  formData: FormData,
): Promise<PlaybookState> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_competitors_playbook_actions");
  const parsed = inputSchema.safeParse({
    competitorUrl: formData.get("competitorUrl"),
    myUrl: formData.get("myUrl") ?? undefined,
    country: formData.get("country") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? tx("invalidInput") };
  }

  try {
    const playbook = await reverseEngineerCompetitor({
      competitorUrl: parsed.data.competitorUrl,
      myUrl: parsed.data.myUrl,
      country: parsed.data.country,
      maxPages: 50,
    });
    return { ok: true, playbook };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message ?? tx("analysisFailed"),
    };
  }
}

export async function playbookToTasks(opts: {
  clientId: number;
  competitorUrl: string;
  synthesis: string;
}): Promise<{ ok: boolean; created: number; error?: string }> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_competitors_playbook_actions");
  if (!opts.synthesis?.trim())
    return { ok: false, created: 0, error: tx("emptySynthesis") };
  if (!Number.isFinite(opts.clientId) || opts.clientId <= 0)
    return { ok: false, created: 0, error: tx("invalidClient") };

  const { db } = await import("@/db/client");
  const { tasks } = await import("@/db/schema");
  const { logActivity } = await import("@/lib/activity");

  const bullets = opts.synthesis
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•]\s+|^\d+[.)]\s+/, "").trim())
    .filter((l) => l.length > 8 && l.length < 400);

  if (bullets.length === 0)
    return { ok: false, created: 0, error: tx("noBulletsParsed") };

  let host = "";
  try {
    host = new URL(opts.competitorUrl).hostname;
  } catch {
    host = opts.competitorUrl;
  }

  const planRef = `competitor-${host}-${Date.now()}`;
  const now = new Date();
  const inserts = bullets.slice(0, 12).map((b, i) => ({
    clientId: opts.clientId,
    title: b,
    whyItMatters: tx("fromCompetitorAnalysisOf", { host }),
    priority: (i < 3 ? "high" : i < 7 ? "medium" : "low") as
      | "high"
      | "medium"
      | "low",
    status: "todo" as const,
    dueDate: new Date(now.getTime() + (i + 1) * 86_400_000),
    source: "competitor_playbook",
    sourceRef: planRef,
  }));

  await db.insert(tasks).values(inserts);

  await logActivity({
    kind: "task.created",
    message: tx("importedTasksFromCompetitorAnalysis", { length: inserts.length, host }),
    level: "success",
    clientId: opts.clientId,
    entityType: "competitor",
  });

  return { ok: true, created: inserts.length };
}
