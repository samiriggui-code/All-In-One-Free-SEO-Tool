"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import {
  extractSocialPreviews,
  type SocialPreview,
} from "@/lib/page-inspectors";
import { saveToolRun } from "@/lib/tool-runs";

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
});

export type SocialState =
  | { ok: true; result: SocialPreview }
  | { ok: false; error: string };

export async function runSocial(
  _prev: SocialState | null,
  formData: FormData,
): Promise<SocialState> {
  await requireSignedIn();
  const parsed = schema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    const t = await getTranslations("tools.ui.social-preview");
    return { ok: false, error: t("errInvalidUrl") };
  }
  const r = await extractSocialPreviews(parsed.data.url);
  if (!r.ok && r.error) return { ok: false, error: r.error };
  await saveToolRun({
    toolId: "social-preview",
    label: parsed.data.url,
    input: parsed.data,
    result: { ok: true, result: r },
  }).catch(() => undefined);
  return { ok: true, result: r };
}
