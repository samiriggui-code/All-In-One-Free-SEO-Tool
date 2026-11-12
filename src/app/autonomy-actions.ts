"use server";

import { actionTx } from "@/lib/action-tx";
import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import { chooseAutonomy } from "@/lib/agent/autonomy";
import type { AutonomyLevel } from "@/lib/agent/autonomy-levels";
import { logActivity } from "@/lib/activity";

/**
 * Record the answer to the first-run autonomy question.
 *
 * Validated here rather than trusted from the client, because this
 * decides whether software is allowed to edit somebody's live website.
 * A bad value must land on the cautious end, never the permissive one.
 */
export async function chooseAutonomyAction(
  level: AutonomyLevel,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_autonomy-actions");
  const allowed: AutonomyLevel[] = ["off", "suggest", "apply_safe", "apply_all"];
  if (!allowed.includes(level)) {
    return { ok: false, error: tx("unknownAutonomyLevel") };
  }
  try {
    await chooseAutonomy(level);
    await logActivity({
      kind: "agent.level_chosen",
      message: tx("autonomySetToFromThe", { level }),
      level: "info",
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
