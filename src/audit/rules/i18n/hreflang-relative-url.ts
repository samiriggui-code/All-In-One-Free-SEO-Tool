import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
export const hreflangRelativeUrlRule = defineRule({
  id: "i18n-hreflang-relative-url",
  name: "Hreflang Relative URLs",
  description: "Checks that hreflang annotations use absolute URLs, not relative ones",
  category: "i18n",
  weight: 6,
  run: (context) => {
    const { $ } = context;
    const hreflangElements = $('link[rel="alternate"][hreflang]');
    if (hreflangElements.length === 0) {
      return pass("i18n-hreflang-relative-url", "No hreflang tags found", {
        count: 0
      });
    }
    const relativeAnnotations: { hreflang: string; href: string; }[] = [];
    hreflangElements.each((_, el) => {
      const $el = $(el);
      const hreflang = ($el.attr("hreflang") || "").trim();
      const href = ($el.attr("href") || "").trim();
      if (!href) return;
      if (!ABSOLUTE_URL_PATTERN.test(href)) {
        relativeAnnotations.push({ hreflang, href });
      }
    });
    if (relativeAnnotations.length === 0) {
      return pass(
        "i18n-hreflang-relative-url",
        `All ${hreflangElements.length} hreflang annotation(s) use absolute URLs`,
        { count: hreflangElements.length }
      );
    }
    return fail(
      "i18n-hreflang-relative-url",
      `Found ${relativeAnnotations.length} hreflang annotation(s) using relative URLs`,
      {
        totalHreflang: hreflangElements.length,
        relativeCount: relativeAnnotations.length,
        relativeAnnotations: relativeAnnotations.slice(0, 10),
        recommendation: "Hreflang targets must be absolute URLs including the protocol (e.g. https://example.com/fr/)."
      }
    );
  }
});
