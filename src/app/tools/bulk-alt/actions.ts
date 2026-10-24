"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import {
  fetchImagesFromUrl,
  generateBulkAlt,
  type AltSuggestion,
} from "@/lib/content-ai-helpers";
import { saveToolRun } from "@/lib/tool-runs";

export type AltState =
  | { ok: true; pageContext: string; suggestions: AltSuggestion[] }
  | { ok: false; error: string };

export async function runBulkAlt(
  _prev: AltState | null,
  formData: FormData,
): Promise<AltState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.bulk-alt");
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, error: t("errUrlRequired") };
  const fullUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  const fetched = await fetchImagesFromUrl(fullUrl);
  if (!fetched) return { ok: false, error: t("errFetch") };
  if (fetched.images.length === 0)
    return { ok: false, error: t("errNoImages") };

  const r = await generateBulkAlt({
    pageContext: fetched.pageContext,
    imageDescriptions: fetched.images,
  });
  if (!r.ok) return { ok: false, error: r.error };
  await saveToolRun({
    toolId: "bulk-alt",
    label: `${fullUrl} · ${r.suggestions.length} alts`,
    input: { url: fullUrl },
    result: { ok: true, pageContext: fetched.pageContext, suggestions: r.suggestions },
  }).catch(() => undefined);
  return {
    ok: true,
    pageContext: fetched.pageContext,
    suggestions: r.suggestions,
  };
}
