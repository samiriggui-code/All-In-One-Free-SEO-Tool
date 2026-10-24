"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import {
  clearToolRuns,
  deleteToolRun,
  listToolRuns,
  togglePin,
} from "@/lib/tool-runs";
import type { ToolRun } from "@/db/schema";

/** Server-side fetcher used by the <RecentRuns> client component. */
export async function fetchRecentRuns(opts: {
  toolId: string;
  clientId?: number | null;
  limit?: number;
}): Promise<ToolRun[]> {
  await requireSignedIn();
  return listToolRuns(opts);
}

export async function deleteRunAction(
  id: number,
  toolId: string,
): Promise<void> {
  await requireSignedIn();
  await deleteToolRun(id);
  revalidatePath(`/tools/${toolId}`);
  revalidatePath("/history");
}

export async function togglePinAction(
  id: number,
  toolId: string,
): Promise<void> {
  await requireSignedIn();
  await togglePin(id);
  revalidatePath(`/tools/${toolId}`);
  revalidatePath("/history");
}

export async function clearAllRunsForTool(
  toolId: string,
  clientId?: number | null,
): Promise<number> {
  await requireSignedIn();
  const count = await clearToolRuns({ toolId, clientId });
  revalidatePath(`/tools/${toolId}`);
  revalidatePath("/history");
  return count;
}
