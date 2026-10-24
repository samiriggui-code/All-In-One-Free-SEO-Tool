"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import {
  generateCoverImagePrompts,
  suggestCategoriesAndTags,
  type CategoryResult,
  type ImagePromptResult,
} from "@/lib/content-helpers";
import { saveToolRun } from "@/lib/tool-runs";

export async function getCoverImagePrompts(formData: FormData): Promise<ImagePromptResult> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.content-helpers");
  const title = String(formData.get("title") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const niche = String(formData.get("niche") ?? "").trim() || null;
  if (!title) return { ok: false, error: t("errTitleRequiredPost") };
  const r = await generateCoverImagePrompts({ title, brief, niche });
  if (r.ok) {
    await saveToolRun({
      toolId: "content-helpers",
      label: t("runLabelCover", { title: title.slice(0, 60) }),
      input: { title, niche },
      result: r,
    }).catch(() => undefined);
  }
  return r;
}

export async function getCategorySuggestions(
  formData: FormData,
): Promise<CategoryResult> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.content-helpers");
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const existingRaw = String(formData.get("existingCategories") ?? "").trim();
  const existingCategories = existingRaw
    ? existingRaw
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  if (!title) return { ok: false, error: t("errTitleRequired") };
  const r = await suggestCategoriesAndTags({ title, excerpt, existingCategories });
  if (r.ok) {
    await saveToolRun({
      toolId: "content-helpers",
      label: t("runLabelCategories", { title: title.slice(0, 60) }),
      input: { title },
      result: r,
    }).catch(() => undefined);
  }
  return r;
}
