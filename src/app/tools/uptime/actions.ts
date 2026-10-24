"use server";

import { requireSignedIn } from "@/lib/action-guard";
import { requireEditor } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { uptimeTargets } from "@/db/schema";
import { pingAll } from "@/lib/uptime";

export async function addTarget(formData: FormData) {
  await requireSignedIn();
  await requireEditor();
  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;
  const expectedStatus = Number(formData.get("expectedStatus") ?? 200);
  const expectedText = String(formData.get("expectedText") ?? "").trim() || null;
  const t = await getTranslations("tools.ui.uptime");
  if (!url) return { ok: false as const, error: t("errUrlRequired") };
  if (!/^https?:\/\//i.test(url))
    return { ok: false as const, error: t("errUrlScheme") };
  await db.insert(uptimeTargets).values({
    url,
    label,
    expectedStatus,
    expectedText,
    enabled: true,
  });
  revalidatePath("/tools/uptime");
  return { ok: true as const };
}

export async function deleteTarget(id: number) {
  await requireSignedIn();
  await requireEditor();
  await db.delete(uptimeTargets).where(eq(uptimeTargets.id, id));
  revalidatePath("/tools/uptime");
}

export async function toggleTarget(id: number, enabled: boolean) {
  await requireSignedIn();
  await requireEditor();
  await db
    .update(uptimeTargets)
    .set({ enabled })
    .where(eq(uptimeTargets.id, id));
  revalidatePath("/tools/uptime");
}

export async function runPingNow() {
  await requireSignedIn();
  const r = await pingAll();
  revalidatePath("/tools/uptime");
  return r;
}
