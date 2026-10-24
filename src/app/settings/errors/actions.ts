"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { requireEditor } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { clearAllResolved, markErrorResolved } from "@/lib/error-log";

export async function resolveErrorAction(id: number): Promise<void> {
  await requireEditor();
  await requireSignedIn();
  await markErrorResolved(id);
  revalidatePath("/settings/errors");
}

export async function clearResolvedAction(): Promise<void> {
  await requireEditor();
  await requireSignedIn();
  await clearAllResolved();
  revalidatePath("/settings/errors");
}
