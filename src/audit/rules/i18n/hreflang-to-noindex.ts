import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const hreflangToNoindexRule = defineRule({
  id: "i18n-hreflang-to-noindex",
  name: "Hreflang to Noindex Conflict",
  description: "Checks if page has both hreflang annotations and noindex directive",
  category: "i18n",
  weight: 10,
  run: (context) => {
    const { $, headers } = context;
    const hasHreflang = $('link[rel="alternate"][hreflang]').length > 0;
    if (!hasHreflang) {
      return pass("i18n-hreflang-to-noindex", "No hreflang tags found, no conflict possible", {
        hasHreflang: false,
        hasNoindex: false
      });
    }
    let hasNoindex4 = false;
    let noindexSource = "";
    $('meta[name="robots"], meta[name="googlebot"]').each((_, el) => {
      const content = ($(el).attr("content") || "").toLowerCase();
      if (content.includes("noindex")) {
        hasNoindex4 = true;
        const name = $(el).attr("name") || "robots";
        noindexSource = `<meta name="${name}" content="${content}">`;
      }
    });
    const xRobotsTag = headers["x-robots-tag"] || "";
    if (xRobotsTag.toLowerCase().includes("noindex")) {
      hasNoindex4 = true;
      noindexSource = noindexSource || `X-Robots-Tag: ${xRobotsTag}`;
    }
    if (!hasNoindex4) {
      return pass("i18n-hreflang-to-noindex", "No conflict between hreflang and indexing directives", {
        hasHreflang: true,
        hasNoindex: false
      });
    }
    const hreflangCount = $('link[rel="alternate"][hreflang]').length;
    return fail(
      "i18n-hreflang-to-noindex",
      "Page has both hreflang annotations and noindex directive (conflicting signals)",
      {
        hasHreflang: true,
        hreflangCount,
        hasNoindex: true,
        noindexSource,
        recommendation: "Remove noindex to allow search engines to index this language version, or remove hreflang if the page should not be indexed"
      }
    );
  }
});
