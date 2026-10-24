import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const hreflangReturnLinksRule = defineRule({
  id: "i18n-hreflang-return-links",
  name: "Hreflang Return Links",
  description: "Checks if hreflang annotations include self-referencing link for the current page",
  category: "i18n",
  weight: 12,
  run: (context) => {
    const { $, url } = context;
    const hreflangElements = $('link[rel="alternate"][hreflang]');
    if (hreflangElements.length === 0) {
      return pass("i18n-hreflang-return-links", "No hreflang tags found (nothing to check)", {
        count: 0
      });
    }
    const hreflangUrls: { hreflang: string; href: string; }[] = [];
    let hasSelfReference = false;
    let currentUrl;
    try {
      currentUrl = new URL(url);
    } catch {
      return pass("i18n-hreflang-return-links", "Cannot parse current URL for comparison", {
        url
      });
    }
    hreflangElements.each((_, el) => {
      const $el = $(el);
      const hreflang = $el.attr("hreflang") || "";
      const href = $el.attr("href") || "";
      hreflangUrls.push({ hreflang, href });
      if (href) {
        try {
          const hrefUrl = new URL(href, url);
          if (hrefUrl.host === currentUrl.host && hrefUrl.pathname === currentUrl.pathname) {
            hasSelfReference = true;
          }
        } catch {
        }
      }
    });
    if (hasSelfReference) {
      return pass(
        "i18n-hreflang-return-links",
        "Hreflang set includes self-referencing link for current page",
        {
          count: hreflangUrls.length,
          hreflangUrls,
          hasSelfReference: true
        }
      );
    }
    return warn(
      "i18n-hreflang-return-links",
      "Hreflang set does not include a self-referencing link for the current page",
      {
        count: hreflangUrls.length,
        hreflangUrls,
        hasSelfReference: false,
        currentUrl: url,
        recommendation: 'Add a <link rel="alternate" hreflang="xx" href="..."> pointing to the current page URL'
      }
    );
  }
});
