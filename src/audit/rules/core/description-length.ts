import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const MIN_LENGTH2 = 120;
export const MAX_LENGTH2 = 160;
export const descriptionLengthRule = defineRule({
  id: "core-description-length",
  name: "Meta Description Length",
  description: `Checks that the meta description is between ${MIN_LENGTH2} and ${MAX_LENGTH2} characters`,
  category: "core",
  weight: 1,
  run: async (context) => {
    const { $ } = context;
    const descriptionElement = $('meta[name="description"]');
    if (descriptionElement.length === 0) {
      return warn(
        "core-description-length",
        'No <meta name="description"> tag found in the document',
        { found: false }
      );
    }
    const content = descriptionElement.first().attr("content")?.trim();
    if (!content) {
      return warn(
        "core-description-length",
        "Meta description tag exists but has no content",
        { found: true, length: 0 }
      );
    }
    const length = content.length;
    if (length < MIN_LENGTH2) {
      return warn(
        "core-description-length",
        `Meta description is too short (${length} characters). Recommended: ${MIN_LENGTH2}-${MAX_LENGTH2} characters`,
        { length, minLength: MIN_LENGTH2, maxLength: MAX_LENGTH2, description: content }
      );
    }
    if (length > MAX_LENGTH2) {
      return warn(
        "core-description-length",
        `Meta description is too long (${length} characters). Recommended: ${MIN_LENGTH2}-${MAX_LENGTH2} characters`,
        { length, minLength: MIN_LENGTH2, maxLength: MAX_LENGTH2, description: content }
      );
    }
    return pass(
      "core-description-length",
      `Meta description length is optimal (${length} characters)`,
      { length, minLength: MIN_LENGTH2, maxLength: MAX_LENGTH2, description: content }
    );
  }
});
