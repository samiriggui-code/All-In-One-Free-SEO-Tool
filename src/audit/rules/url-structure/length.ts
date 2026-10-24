import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const URL_LENGTH_GOOD = 75;
export const URL_LENGTH_WARN = 200;
export const lengthRule = defineRule({
  id: "url-length",
  name: "URL Length",
  description: "Checks if the full URL length is within recommended limits for SEO",
  category: "url",
  weight: 5,
  run: async (context) => {
    const { url } = context;
    const length = url.length;
    const details = {
      url,
      length,
      maxRecommended: URL_LENGTH_GOOD,
      maxAcceptable: URL_LENGTH_WARN
    };
    if (length <= URL_LENGTH_GOOD) {
      return pass(
        "url-length",
        `URL length is ${length} characters (good, <= ${URL_LENGTH_GOOD})`,
        details
      );
    }
    if (length <= URL_LENGTH_WARN) {
      return warn(
        "url-length",
        `URL length is ${length} characters (recommended: <= ${URL_LENGTH_GOOD})`,
        details
      );
    }
    return fail(
      "url-length",
      `URL length is ${length} characters (exceeds ${URL_LENGTH_WARN} limit)`,
      details
    );
  }
});
