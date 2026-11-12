"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { requireSettingsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setSetting, deleteSetting } from "@/lib/settings-store";

export type SaveCapState =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function saveCap(
  _prev: SaveCapState | null,
  formData: FormData,
): Promise<SaveCapState> {
  await requireSettingsAdmin();
  await requireSignedIn();
  const tx = await getTranslations("ui.app_settings_ai-usage_actions");
  const raw = String(formData.get("cap") ?? "").trim();
  if (raw === "") {
    await deleteSetting("ai.monthly_cap_usd");
    revalidatePath("/settings/ai-usage");
    return { ok: true, message: tx("capRemoved") };
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: tx("capMustBeANon") };
  }
  await setSetting("ai.monthly_cap_usd", n);
  revalidatePath("/settings/ai-usage");
  return { ok: true, message: tx("capSetToMo", { n: n.toFixed(2) }) };
}
