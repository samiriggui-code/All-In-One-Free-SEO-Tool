"use server";

import { assertOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { clearAllResolved, markErrorResolved } from "@/lib/error-log";

export async function resolveErrorAction(id: number): Promise<void> {
  await assertOwner();
  await markErrorResolved(id);
  revalidatePath("/settings/errors");
}

export async function clearResolvedAction(): Promise<void> {
  await assertOwner();
  await clearAllResolved();
  revalidatePath("/settings/errors");
}
