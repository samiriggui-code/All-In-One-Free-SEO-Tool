import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const hreflangMultipleMethodsRule = defineRule({
  id: "i18n-hreflang-multiple-methods",
  name: "Hreflang Multiple Methods",
  description: "Checks if hreflang is specified via both HTML link tags and HTTP headers",
  category: "i18n",
  weight: 6,
  run: (context) => {
    const { $, headers } = context;
    const hasHtmlHreflang = $('link[rel="alternate"][hreflang]').length > 0;
    const linkHeader = headers["link"] || "";
    const hasHeaderHreflang = linkHeader.toLowerCase().includes("hreflang");
    if (!hasHtmlHreflang && !hasHeaderHreflang) {
      return pass("i18n-hreflang-multiple-methods", "No hreflang declarations found", {
        htmlHreflang: false,
        headerHreflang: false
      });
    }
    if (hasHtmlHreflang && !hasHeaderHreflang) {
      return pass(
        "i18n-hreflang-multiple-methods",
        "Hreflang declared via HTML link tags only (consistent method)",
        {
          htmlHreflang: true,
          headerHreflang: false,
          method: "html",
          htmlCount: $('link[rel="alternate"][hreflang]').length
        }
      );
    }
    if (!hasHtmlHreflang && hasHeaderHreflang) {
      return pass(
        "i18n-hreflang-multiple-methods",
        "Hreflang declared via HTTP Link header only (consistent method)",
        {
          htmlHreflang: false,
          headerHreflang: true,
          method: "header"
        }
      );
    }
    return warn(
      "i18n-hreflang-multiple-methods",
      "Hreflang declared via both HTML link tags and HTTP Link header (risk of inconsistency)",
      {
        htmlHreflang: true,
        headerHreflang: true,
        htmlCount: $('link[rel="alternate"][hreflang]').length,
        linkHeader,
        recommendation: "Use a single method for hreflang declaration to avoid conflicting annotations"
      }
    );
  }
});
