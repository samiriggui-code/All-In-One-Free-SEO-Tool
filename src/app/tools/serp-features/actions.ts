"use server";

import { requireSignedIn } from "@/lib/action-guard";
import { getTranslations } from "next-intl/server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  captureSerpSnapshot,
  deleteSnapshot,
} from "@/lib/serp-feature-tracker";

const captureSchema = z.object({
  query: z.string().trim().min(2).max(200),
  country: z.string().trim().min(2).max(4).default("US"),
  ourDomain: z.string().trim().optional(),
});

export type CaptureState =
  | { ok: true; snapshotId: number }
  | { ok: false; error: string };

export async function runCapture(
  _prev: CaptureState | null,
  formData: FormData,
): Promise<CaptureState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.serp-features");
  const parsed = captureSchema.safeParse({
    query: formData.get("query"),
    country: formData.get("country") || "US",
    ourDomain: formData.get("ourDomain") || undefined,
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("errInvalidInput") };
  const r = await captureSerpSnapshot({
    query: parsed.data.query,
    country: parsed.data.country,
    ourDomain: parsed.data.ourDomain,
  });
  revalidatePath("/tools/serp-features");
  if (!r.ok) return { ok: false, error: r.error ?? t("errCaptureFailed") };
  return { ok: true, snapshotId: r.snapshotId! };
}

export async function removeSnapshot(id: number): Promise<{ ok: true }> {
  await requireSignedIn();
  await deleteSnapshot(id);
  revalidatePath("/tools/serp-features");
  return { ok: true };
}
