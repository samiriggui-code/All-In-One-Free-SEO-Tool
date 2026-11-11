"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { MISSION_KINDS, MISSION_STATUSES, missions } from "@/db/schema";
import { requireSignedIn } from "@/lib/action-guard";
import { requireClientAccess } from "@/lib/auth";
import { MissionNeedsAuditError, createMission } from "@/lib/projects";

export type MissionActionResult = { ok: true } | { ok: false; error: "needs_audit" | "invalid" };

const input = z.object({
  projectId: z.coerce.number().int().positive(),
  kind: z.enum(MISSION_KINDS),
  title: z.string().trim().min(2).max(120),
  targetStack: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

/** Create a mission on a project. Refused until its full audit is done. */
export async function addMission(
  _prev: MissionActionResult | null,
  formData: FormData,
): Promise<MissionActionResult> {
  await requireSignedIn();
  const parsed = input.safeParse({
    projectId: formData.get("projectId"),
    kind: formData.get("kind"),
    title: formData.get("title"),
    targetStack: formData.get("targetStack") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "invalid" };
  await requireClientAccess(parsed.data.projectId, { edit: true });
  try {
    await createMission({
      projectId: parsed.data.projectId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      targetStack: parsed.data.kind === "redesign" ? (parsed.data.targetStack ?? null) : null,
      notes: parsed.data.notes ?? null,
    });
  } catch (e) {
    if (e instanceof MissionNeedsAuditError) return { ok: false, error: "needs_audit" };
    throw e;
  }
  revalidatePath(`/clients/${parsed.data.projectId}`);
  return { ok: true };
}

/** Move a mission along: proposed, active, paused, done, cancelled. */
export async function setMissionStatus(missionId: number, status: string): Promise<void> {
  await requireSignedIn();
  const next = z.enum(MISSION_STATUSES).safeParse(status);
  if (!next.success || !Number.isInteger(missionId)) return;
  const [row] = await db
    .select({ clientId: missions.clientId, startedAt: missions.startedAt })
    .from(missions)
    .where(eq(missions.id, missionId))
    .limit(1);
  if (!row) return;
  await requireClientAccess(row.clientId, { edit: true });
  const now = new Date();
  await db
    .update(missions)
    .set({
      status: next.data,
      startedAt: next.data === "active" && !row.startedAt ? now : row.startedAt,
      endedAt: next.data === "done" || next.data === "cancelled" ? now : null,
      updatedAt: now,
    })
    .where(eq(missions.id, missionId));
  revalidatePath(`/clients/${row.clientId}`);
}
