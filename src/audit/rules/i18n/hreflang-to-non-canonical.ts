import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const hreflangToNonCanonicalRule = defineRule({
  id: "i18n-hreflang-to-non-canonical",
  name: "Hreflang to Non-Canonical URL",
  description: "Checks if hreflang annotations point to non-canonical URLs",
  category: "i18n",
  weight: 10,
  run: (context) => {
    const { $, url } = context;
    const hreflangElements = $('link[rel="alternate"][hreflang]');
    if (hreflangElements.length === 0) {
      return pass("i18n-hreflang-to-non-canonical", "No hreflang tags found, no conflict possible", {
        hasHreflang: false
      });
    }
    const canonicalHref = $('link[rel="canonical"]').attr("href");
    if (!canonicalHref) {
      return pass("i18n-hreflang-to-non-canonical", "No canonical URL specified, cannot compare", {
        hasHreflang: true,
        hasCanonical: false
      });
    }
    let canonicalUrl;
    try {
      canonicalUrl = new URL(canonicalHref, url);
    } catch {
      return pass("i18n-hreflang-to-non-canonical", "Cannot parse canonical URL for comparison", {
        hasHreflang: true,
        canonicalHref
      });
    }
    let currentUrl;
    try {
      currentUrl = new URL(url);
    } catch {
      return pass("i18n-hreflang-to-non-canonical", "Cannot parse current URL for comparison", {
        url
      });
    }
    const mismatches: { hreflang: string; href: string; }[] = [];
    hreflangElements.each((_, el) => {
      const $el = $(el);
      const hreflang = $el.attr("hreflang") || "";
      const href = $el.attr("href") || "";
      if (!href) return;
      try {
        const hrefUrl = new URL(href, url);
        if (hrefUrl.host === currentUrl.host && hrefUrl.pathname === currentUrl.pathname) {
          const normalizedHref = hrefUrl.origin + hrefUrl.pathname;
          const normalizedCanonical = canonicalUrl.origin + canonicalUrl.pathname;
          if (normalizedHref !== normalizedCanonical) {
            mismatches.push({ hreflang, href });
          }
        }
      } catch {
      }
    });
    if (mismatches.length === 0) {
      return pass(
        "i18n-hreflang-to-non-canonical",
        "Hreflang self-reference matches canonical URL",
        {
          hasHreflang: true,
          hasCanonical: true,
          canonicalUrl: canonicalUrl.href
        }
      );
    }
    return warn(
      "i18n-hreflang-to-non-canonical",
      "Hreflang self-reference URL differs from canonical URL",
      {
        mismatches,
        canonicalUrl: canonicalUrl.href,
        recommendation: "Ensure hreflang URLs point to the canonical version of each page"
      }
    );
  }
});
