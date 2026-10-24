"use server";

import { mayEdit } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setSetting, getSetting } from "@/lib/settings-store";

export async function setUiMode(mode: "guided" | "pro") {
  // The toggle is in the shell for everyone; for a viewer it does nothing.
  if (!(await mayEdit())) return;
  await setSetting("ui.mode", mode);
  revalidatePath("/", "layout");
}

export async function getUiMode(): Promise<"guided" | "pro"> {
  const m = await getSetting<"guided" | "pro">("ui.mode");
  return m ?? "guided";
}
