"use server";

import { requireSignedIn } from "@/lib/action-guard";

/**
 * Server actions for the AI-tools findings checklist.
 *
 *   markFindingStatus(findingId, status, note?) — flips a finding's
 *     status (new / in_progress / resolved / ignored)
 *
 *   getFindingsForRun(runId) — returns the list for a given tool_run
 *
 * The findings table is shared across every AI tool (SXO, GEO, E-E-A-T,
 * AI site audit, …) so this UI works the same everywhere — each tool
 * just persists rows pointing at its own tool_run + a stable signature.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { toolFindings, toolRuns, type ToolFinding } from "@/db/schema";
import { requireEditor } from "@/lib/auth";
import { mayAccessClient } from "@/lib/client-scope";
import { revalidatePath } from "next/cache";

export type FindingStatus = "new" | "in_progress" | "resolved" | "ignored";

export async function markFindingStatus(
  findingId: number,
  status: FindingStatus,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireSignedIn();
  if (!Number.isFinite(findingId)) {
    return { ok: false, error: "Invalid finding id" };
  }
  // A finding belongs to a client: only someone who may edit that client
  // changes its status. This used to take any id from any signed-in user,
  // read-only members included. Unknown and out-of-scope ids get the same
  // answer, so the reply does not reveal which ids exist.
  await requireEditor();
  const [finding] = await db
    .select({ clientId: toolFindings.clientId })
    .from(toolFindings)
    .where(eq(toolFindings.id, findingId))
    .limit(1);
  if (!finding || !(await mayAccessClient(finding.clientId))) {
    return { ok: false, error: "Finding not found" };
  }
  const completedAt = status === "resolved" ? new Date() : null;
  try {
    await db
      .update(toolFindings)
      .set({
        status,
        completedAt,
        completedNote: note?.slice(0, 500) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(toolFindings.id, findingId));
    // Best-effort revalidate — caller pages re-render with the new status
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function getFindingsForRun(
  runId: number,
): Promise<ToolFinding[]> {
  await requireSignedIn();
  // Same scope as the run itself: a run for a client the user may not see
  // reads as empty, like one that does not exist.
  const [run] = await db
    .select({ clientId: toolRuns.clientId })
    .from(toolRuns)
    .where(eq(toolRuns.id, runId))
    .limit(1);
  if (!run || !(await mayAccessClient(run.clientId))) return [];
  return db
    .select()
    .from(toolFindings)
    .where(eq(toolFindings.runId, runId))
    .orderBy(desc(toolFindings.severity), desc(toolFindings.createdAt));
}
