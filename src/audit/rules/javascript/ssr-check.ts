import { bodyText } from "@/audit/rules/content/utils/visible-text";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const CSR_ROOT_SELECTORS = ["#root", "#app", "#__next", "#__nuxt", "#__svelte"];
export const NOSCRIPT_JS_PATTERNS = [
  /enable\s+javascript/i,
  /javascript\s+is\s+required/i,
  /you\s+need\s+to\s+enable\s+javascript/i,
  /this\s+app\s+requires\s+javascript/i,
  /please\s+enable\s+javascript/i,
  /javascript\s+must\s+be\s+enabled/i,
  /requires\s+javascript/i
];
export const ssrCheckRule = defineRule({
  id: "js-ssr-check",
  name: "Server-Side Rendering Check",
  description: "Checks if the page uses SSR or relies on client-side rendering only",
  category: "js",
  weight: 10,
  run: async (context) => {
    const { $ } = context;
    const bodyText2 = bodyText($);
    const bodyTextLength = bodyText2.length;
    let hasEmptyRoot = false;
    let rootSelector = null;
    for (const selector of CSR_ROOT_SELECTORS) {
      const el = $(selector);
      if (el.length > 0) {
        const rootText = el.text().trim();
        const rootChildren = el.children().length;
        if (rootText.length < 50 && rootChildren <= 2) {
          hasEmptyRoot = true;
          rootSelector = selector;
          break;
        }
      }
    }
    let hasJsRequiredNoscript = false;
    let noscriptMessage = null;
    $("noscript").each((_, el) => {
      const text = $(el).text().trim();
      for (const pattern of NOSCRIPT_JS_PATTERNS) {
        if (pattern.test(text)) {
          hasJsRequiredNoscript = true;
          noscriptMessage = text.slice(0, 200);
          return false;
        }
      }
    });
    const scriptCount = $("script").length;
    const details = {
      bodyTextLength,
      hasEmptyRoot,
      rootSelector,
      hasJsRequiredNoscript,
      scriptCount
    };
    if (bodyTextLength < 200 && hasEmptyRoot) {
      return fail(
        "js-ssr-check",
        "Page appears to be client-side rendered only: empty root element with minimal HTML content",
        {
          ...details,
          ...noscriptMessage ? { noscriptMessage } : {},
          impact: "Search engines may see an empty page if JavaScript execution fails or is delayed",
          recommendation: "Implement server-side rendering (SSR) or static site generation (SSG) to include content in initial HTML"
        }
      );
    }
    if (hasEmptyRoot && bodyTextLength < 500) {
      return warn(
        "js-ssr-check",
        "Page may rely on client-side rendering: root element has minimal content",
        {
          ...details,
          ...noscriptMessage ? { noscriptMessage } : {},
          recommendation: "Consider implementing SSR to ensure content is available in the initial HTML response"
        }
      );
    }
    if (hasJsRequiredNoscript && bodyTextLength < 500) {
      return warn(
        "js-ssr-check",
        "Page indicates JavaScript is required and has minimal HTML content",
        {
          ...details,
          noscriptMessage,
          recommendation: "Implement SSR so search engines can access content without JavaScript"
        }
      );
    }
    return pass(
      "js-ssr-check",
      "Page appears to be server-side rendered with content in the initial HTML",
      details
    );
  }
});
