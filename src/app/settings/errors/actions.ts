"use server";

import { requireEditor } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { clearAllResolved, markErrorResolved } from "@/lib/error-log";

export async function resolveErrorAction(id: number): Promise<void> {
  await requireEditor();
  await markErrorResolved(id);
  revalidatePath("/settings/errors");
}

export async function clearResolvedAction(): Promise<void> {
  await requireEditor();
  await clearAllResolved();
  revalidatePath("/settings/errors");
}
