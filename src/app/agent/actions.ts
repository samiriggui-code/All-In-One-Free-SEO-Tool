"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";
import { requireClientAccess } from "@/lib/auth";

import { eq } from "drizzle-orm";
import { safeRevalidatePath } from "@/lib/safe-revalidate";
import { db } from "@/db/client";
import { aiSuggestions, tasks } from "@/db/schema";
import { runSeoAgent, type AgentRunResult } from "@/lib/seo-agent";
import {
  runAgentActions,
  type AgentRunReport,
} from "@/lib/seo-agent-runner";

export async function runAgent(clientId: number): Promise<AgentRunResult> {
  await requireSignedIn();
  await requireClientAccess(clientId, { edit: true });
  const result = await runSeoAgent(clientId);
  safeRevalidatePath(`/agent/c/${clientId}`);
  return result;
}

export async function runAgentExecute(
  clientId: number,
): Promise<AgentRunReport> {
  await requireSignedIn();
  await requireClientAccess(clientId, { edit: true });
  const report = await runAgentActions(clientId);
  safeRevalidatePath(`/agent/c/${clientId}`);
  safeRevalidatePath(`/clients/${clientId}`);
  safeRevalidatePath("/tasks");
  return report;
}

export async function applySuggestion(suggestionId: number) {
  await requireSignedIn();
  const [s] = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.id, suggestionId))
    .limit(1);
  if (!s) return;
  await requireClientAccess(s.clientId, { edit: true });

  await db
    .update(aiSuggestions)
    .set({ status: "applied", updatedAt: new Date() })
    .where(eq(aiSuggestions.id, suggestionId));

  safeRevalidatePath(`/agent/c/${s.clientId}`);
}

export async function dismissSuggestion(suggestionId: number) {
  await requireSignedIn();
  const [s] = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.id, suggestionId))
    .limit(1);
  if (!s) return;
  await requireClientAccess(s.clientId, { edit: true });

  await db
    .update(aiSuggestions)
    .set({ status: "dismissed", updatedAt: new Date() })
    .where(eq(aiSuggestions.id, suggestionId));

  safeRevalidatePath(`/agent/c/${s.clientId}`);
}

export async function reopenSuggestion(suggestionId: number) {
  await requireSignedIn();
  const [s] = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.id, suggestionId))
    .limit(1);
  if (!s) return;
  await requireClientAccess(s.clientId, { edit: true });

  await db
    .update(aiSuggestions)
    .set({ status: "new", updatedAt: new Date() })
    .where(eq(aiSuggestions.id, suggestionId));

  safeRevalidatePath(`/agent/c/${s.clientId}`);
}

/**
 * Promote a suggestion into a real task on the client's task list — useful
 * when the user wants to track applying it as work-in-progress.
 */
export async function suggestionToTask(suggestionId: number) {
  await requireSignedIn();
  const tx = await getTranslations("ui.app_agent_actions");
  const [s] = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.id, suggestionId))
    .limit(1);
  if (!s) return;
  await requireClientAccess(s.clientId, { edit: true });

  const titleByType: Record<string, string> = {
    title_rewrite: tx("updatePageTitle"),
    meta_description_rewrite: tx("updateMetaDescription"),
    h1_rewrite: tx("updateH1"),
    quick_win_action: tx("quickWinOptimization"),
    content_idea: tx("writeNewContent"),
    internal_link: tx("addInternalLink"),
    schema_markup: tx("addStructuredData"),
    general: tx("aiSuggestion"),
  };

  await db.insert(tasks).values({
    clientId: s.clientId,
    title: `${titleByType[s.type] ?? tx("aiSuggestion")}${s.targetUrl ? ` — ${new URL(s.targetUrl).pathname}` : ""}`,
    description: s.suggestedValue,
    whyItMatters: s.rationale ?? undefined,
    priority: s.priority,
    status: "todo" as const,
    source: "agent_suggestion",
    sourceRef: `suggestion-${s.id}`,
  });

  await db
    .update(aiSuggestions)
    .set({ status: "applied", updatedAt: new Date() })
    .where(eq(aiSuggestions.id, suggestionId));

  safeRevalidatePath(`/agent/c/${s.clientId}`);
  safeRevalidatePath(`/clients/${s.clientId}`);
  safeRevalidatePath("/tasks");
}
