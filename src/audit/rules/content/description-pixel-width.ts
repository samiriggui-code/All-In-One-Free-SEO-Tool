import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { estimatePixelWidth } from "@/audit/rules/content/utils/pixel-width";

export const MAX_GOOD_WIDTH2 = 920;
export const MAX_WARN_WIDTH2 = 990;
export const descriptionPixelWidthRule = defineRule({
  id: "content-description-pixel-width",
  name: "Description Pixel Width",
  description: "Estimates meta description pixel width to predict SERP truncation",
  category: "content",
  weight: 6,
  run: async (context) => {
    const { $ } = context;
    const description = $('meta[name="description"]').attr("content");
    if (!description) {
      return pass(
        "content-description-pixel-width",
        "No meta description found (handled by other rules)",
        {
          description: null,
          reason: "skipped"
        }
      );
    }
    const trimmedDescription = description.trim();
    const estimatedWidth = estimatePixelWidth(trimmedDescription);
    const details = {
      description: trimmedDescription,
      estimatedWidth,
      characterCount: trimmedDescription.length,
      thresholds: {
        good: MAX_GOOD_WIDTH2,
        warn: MAX_WARN_WIDTH2
      }
    };
    if (estimatedWidth > MAX_WARN_WIDTH2) {
      return fail(
        "content-description-pixel-width",
        `Meta description will be truncated in SERP: estimated ${estimatedWidth}px (max ~${MAX_GOOD_WIDTH2}px)`,
        {
          ...details,
          impact: "Truncated descriptions lose the call-to-action and may reduce click-through rates",
          recommendation: "Shorten the description to fit within 920px (~155 characters). Place the most compelling information first."
        }
      );
    }
    if (estimatedWidth > MAX_GOOD_WIDTH2) {
      return warn(
        "content-description-pixel-width",
        `Meta description may be truncated in SERP: estimated ${estimatedWidth}px (max ~${MAX_GOOD_WIDTH2}px)`,
        {
          ...details,
          impact: "Description is borderline and may be truncated depending on exact font rendering",
          recommendation: "Consider trimming a few characters to ensure the description displays fully in search results"
        }
      );
    }
    return pass(
      "content-description-pixel-width",
      `Meta description fits within SERP display: estimated ${estimatedWidth}px`,
      details
    );
  }
});
