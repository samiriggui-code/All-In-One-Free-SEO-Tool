"use server";

import { requireSignedIn } from "@/lib/action-guard";
import { getTranslations } from "next-intl/server";

import { callAI } from "@/lib/ai-call";
import { saveToolRun } from "@/lib/tool-runs";

export type PlagiarismCheck = {
  ok: true;
  /** 0-100 — higher = more likely AI-generated. */
  aiLikelihood: number;
  /** 0-100 — higher = more original (less generic / templated). */
  originalityScore: number;
  /** AI's plain-language read on the content. */
  verdict: string;
  /** Specific sentences / phrases flagged as common AI templates. */
  flags: { snippet: string; reason: string }[];
  /** Suggested external tools to verify against the live web. */
  externalChecks: { name: string; url: string; note: string }[];
};

export type PlagiarismResult = PlagiarismCheck | { ok: false; error: string };

export async function checkPlagiarism(input: {
  content: string;
}): Promise<PlagiarismResult> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.plagiarism");
  const text = input.content.trim();
  if (!text) return { ok: false, error: t("errPaste") };
  if (text.length < 100) {
    return {
      ok: false,
      error: t("errTooShort"),
    };
  }
  if (text.length > 20_000) {
    return {
      ok: false,
      error: t("errTooLong"),
    };
  }

  const system = `You are an editorial AI auditing content for two things: (1) likelihood that an LLM wrote it, (2) genuine originality.

For (1) AI likelihood, look for: hedge words ("it's important to note", "in today's world", "in the realm of"), uniform sentence length, balanced "on the one hand / on the other", listicles with no specific examples, generic transitions ("furthermore", "moreover", "in conclusion"), absence of named people/places/dates, abstract claims without numbers.

For (2) originality, look for: specific named examples, real numbers / dates, surprising claims, first-person experience, contrarian takes, tight sentences without filler.

Return a JSON object with EXACTLY this shape (no prose around it):
{
  "aiLikelihood": <0-100 integer>,
  "originalityScore": <0-100 integer>,
  "verdict": "<one-paragraph plain English summary>",
  "flags": [
    { "snippet": "<sentence or phrase from the content>", "reason": "<why it reads as templated/AI>" }
  ]
}

Return up to 5 flags. If the content is high-originality, flags can be empty.`;

  const ai = await callAI({
    system,
    user: `Analyze this content:\n\n${text}`,
    maxTokens: 1200,
    temperature: 0.2,
    ignoreCreditSaver: true,
  });

  if (!ai) {
    return {
      ok: false,
      error: t("errNoAi"),
    };
  }

  // Robust JSON extraction — strip code fences and common preamble
  let cleaned = ai.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  // Find the first { and last } in case the model added preamble
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1);

  try {
    const parsed = JSON.parse(cleaned) as {
      aiLikelihood: number;
      originalityScore: number;
      verdict: string;
      flags?: { snippet: string; reason: string }[];
    };
    const result: PlagiarismCheck = {
      ok: true,
      aiLikelihood: clamp(parsed.aiLikelihood, 0, 100),
      originalityScore: clamp(parsed.originalityScore, 0, 100),
      verdict: parsed.verdict ?? "",
      flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 5) : [],
      externalChecks: [
        {
          name: t("ext.copyleaksName"),
          url: "https://copyleaks.com/ai-content-detector",
          note: t("ext.copyleaksNote"),
        },
        {
          name: "GPTZero",
          url: "https://gptzero.me/",
          note: t("ext.gptzeroNote"),
        },
        {
          name: "Originality.ai",
          url: "https://originality.ai/",
          note: t("ext.originalityNote"),
        },
        {
          name: t("ext.quetextName"),
          url: "https://www.quetext.com/",
          note: t("ext.quetextNote"),
        },
        {
          name: t("ext.googleName"),
          url: `https://www.google.com/search?q=${encodeURIComponent(`"${text.slice(0, 80)}"`)}`,
          note: t("ext.googleNote"),
        },
      ],
    };
    await saveToolRun({
      toolId: "plagiarism",
      label: t("runLabel", {
        ai: result.aiLikelihood,
        originality: result.originalityScore,
      }),
      input: { length: text.length },
      result,
    }).catch(() => undefined);
    return result;
  } catch {
    return {
      ok: false,
      error: t("errFormat"),
    };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
