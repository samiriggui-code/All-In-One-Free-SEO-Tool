import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const mainLandmarkRule = defineRule({
  id: "a11y-main-landmark",
  name: "Main Landmark",
  description: 'Checks that the page has exactly one <main> or role="main" landmark',
  category: "a11y",
  weight: 5,
  run: (context) => {
    const { $, url } = context;
    const count = $('main, [role="main"]').length;
    const details = { url, count };
    if (count === 0) {
      return fail(
        "a11y-main-landmark",
        "No main landmark found. Add <main> so users can skip directly to the content.",
        details
      );
    }
    if (count > 1) {
      return warn(
        "a11y-main-landmark",
        `${count} main landmarks found. Exactly one should identify the primary content.`,
        details
      );
    }
    return pass("a11y-main-landmark", "Page has one main landmark", details);
  }
});
