"use server";

import { revalidatePath } from "next/cache";
import { requireSignedIn } from "@/lib/action-guard";
import { requireSettingsAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/settings-store";
import { getDisabledTools } from "@/lib/tool-activation";
import { catalogEntry } from "@/lib/tool-catalog";

/** Turns one tool of the catalogue on or off. Owner only. */
export async function setToolEnabled(href: string, enabled: boolean): Promise<{ ok: boolean }> {
  await requireSettingsAdmin();
  await requireSignedIn();
  const entry = catalogEntry(href);
  if (!entry) return { ok: false };
  const next = new Set(await getDisabledTools());
  if (enabled) next.delete(entry.href);
  else next.add(entry.href);
  await setSetting("tools.disabled", [...next].sort());
  revalidatePath("/", "layout");
  return { ok: true };
}
