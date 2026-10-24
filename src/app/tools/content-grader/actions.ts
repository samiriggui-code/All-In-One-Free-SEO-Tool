"use server";

import { requireSignedIn } from "@/lib/action-guard";
import { getTranslations } from "next-intl/server";

import { z } from "zod";
import {
  buildCorpus,
  gradeAgainstCorpus,
  type CorpusInsights,
  type GradeResult,
} from "@/lib/content-grader";
import { saveToolRun } from "@/lib/tool-runs";

const inputSchema = z.object({
  targetKeyword: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(8).default("US"),
  content: z.string().trim().min(50).max(80_000),
});

export type GradeContentState =
  | {
      ok: true;
      insights: CorpusInsights;
      grade: GradeResult;
      targetKeyword: string;
    }
  | { ok: false; error: string };

export async function gradeContent(
  _prev: GradeContentState | null,
  formData: FormData,
): Promise<GradeContentState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.content-grader");
  const parsed = inputSchema.safeParse({
    targetKeyword: formData.get("targetKeyword"),
    country: formData.get("country") || "US",
    content: formData.get("content"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error:
        field === "targetKeyword"
          ? t("errors.keyword")
          : field === "country"
            ? t("errors.country")
            : field === "content"
              ? t("errors.content")
              : t("errors.invalid"),
    };
  }

  let insights: CorpusInsights;
  try {
    insights = await buildCorpus({
      targetKeyword: parsed.data.targetKeyword,
      country: parsed.data.country,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message || t("errors.corpusFailed") };
  }
  if (insights.corpusSize === 0) {
    return {
      ok: false,
      error: insights.error ?? t("errors.emptyCorpus"),
    };
  }

  const grade = gradeAgainstCorpus({
    content: parsed.data.content,
    targetKeyword: parsed.data.targetKeyword,
    insights,
  });

  const result = {
    ok: true as const,
    insights,
    grade,
    targetKeyword: parsed.data.targetKeyword,
  };
  await saveToolRun({
    toolId: "content-grader",
    label: `${parsed.data.targetKeyword} · grade ${grade.score}/100`,
    input: {
      targetKeyword: parsed.data.targetKeyword,
      country: parsed.data.country,
    },
    result,
  }).catch(() => undefined);
  return result;
}
