import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const WARN_THRESHOLD = 100;
export const FAIL_THRESHOLD = 300;
export const excessiveRule = defineRule({
  id: "links-excessive",
  name: "Reasonable Link Count",
  description: "Checks that the page does not contain an excessive number of links",
  category: "links",
  weight: 5,
  run: (context) => {
    const totalLinks = context.links.length;
    if (totalLinks > FAIL_THRESHOLD) {
      return fail(
        "links-excessive",
        `Page has ${totalLinks} links, which exceeds the recommended maximum of ${FAIL_THRESHOLD}`,
        {
          totalLinks,
          threshold: FAIL_THRESHOLD,
          recommendation: "Reduce the number of links to avoid diluting page authority and hurting crawl efficiency"
        }
      );
    }
    if (totalLinks > WARN_THRESHOLD) {
      return warn(
        "links-excessive",
        `Page has ${totalLinks} links, which is above the recommended ${WARN_THRESHOLD}`,
        {
          totalLinks,
          threshold: WARN_THRESHOLD,
          recommendation: "Consider reducing links to improve page authority distribution"
        }
      );
    }
    return pass(
      "links-excessive",
      `Page has ${totalLinks} link(s), within recommended limits`,
      { totalLinks }
    );
  }
});
