import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { estimatePixelWidth } from "@/audit/rules/content/utils/pixel-width";

export const MAX_GOOD_WIDTH = 580;
export const MAX_WARN_WIDTH = 620;
export const titlePixelWidthRule = defineRule({
  id: "content-title-pixel-width",
  name: "Title Pixel Width",
  description: "Estimates title tag pixel width to predict SERP truncation",
  category: "content",
  weight: 7,
  run: async (context) => {
    const { $ } = context;
    const title = $(DOCUMENT_TITLE).first().text().trim();
    if (!title) {
      return pass(
        "content-title-pixel-width",
        "No title tag found (handled by core rules)",
        {
          title: null,
          reason: "skipped"
        }
      );
    }
    const estimatedWidth = estimatePixelWidth(title);
    const details = {
      title,
      estimatedWidth,
      characterCount: title.length,
      thresholds: {
        good: MAX_GOOD_WIDTH,
        warn: MAX_WARN_WIDTH
      }
    };
    if (estimatedWidth > MAX_WARN_WIDTH) {
      return fail(
        "content-title-pixel-width",
        `Title will be truncated in SERP: estimated ${estimatedWidth}px (max ~${MAX_GOOD_WIDTH}px)`,
        {
          ...details,
          impact: "Truncated titles hide important keywords and reduce click-through rates in search results",
          recommendation: "Shorten the title to fit within 580px. Move the most important keywords to the beginning."
        }
      );
    }
    if (estimatedWidth > MAX_GOOD_WIDTH) {
      return warn(
        "content-title-pixel-width",
        `Title may be truncated in SERP: estimated ${estimatedWidth}px (max ~${MAX_GOOD_WIDTH}px)`,
        {
          ...details,
          impact: "Title is borderline and may be truncated depending on the exact font rendering",
          recommendation: "Consider trimming a few characters to ensure the title displays fully in search results"
        }
      );
    }
    return pass(
      "content-title-pixel-width",
      `Title fits within SERP display: estimated ${estimatedWidth}px`,
      details
    );
  }
});
