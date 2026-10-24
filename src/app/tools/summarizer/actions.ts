"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { summarizeContent, type Summary } from "@/lib/content-ai-helpers";
import { saveToolRun } from "@/lib/tool-runs";
import { getTranslations } from "next-intl/server";

export type SumState =
  | { ok: true; summary: Summary }
  | { ok: false; error: string };

export async function runSummarize(
  _prev: SumState | null,
  formData: FormData,
): Promise<SumState> {
  await requireSignedIn();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) {
    const t = await getTranslations("tools.ui.summarizer");
    return { ok: false, error: t("errorEmpty") };
  }
  const r = await summarizeContent({ text });
  if (!r.ok) return { ok: false, error: r.error };
  await saveToolRun({
    toolId: "summarizer",
    label: `${text.split(/\s+/).length} words → summary`,
    input: { length: text.length },
    result: { ok: true, summary: r.summary },
  }).catch(() => undefined);
  return { ok: true, summary: r.summary };
}
