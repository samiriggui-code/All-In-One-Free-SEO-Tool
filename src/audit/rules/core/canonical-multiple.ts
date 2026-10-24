import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export function normalizeUrl4(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.replace(/\/$/, "").toLowerCase();
  }
}
export const canonicalMultipleRule = defineRule({
  id: "core-canonical-multiple",
  name: "Multiple Canonical Tags",
  description: 'Checks for multiple <link rel="canonical"> elements in the HTML and whether they agree',
  category: "core",
  weight: 6,
  run: async (context) => {
    const { $ } = context;
    const hrefs: string[] = [];
    $('link[rel="canonical"]').each((_, el) => {
      hrefs.push($(el).attr("href")?.trim() || "");
    });
    if (hrefs.length <= 1) {
      return pass(
        "core-canonical-multiple",
        "At most one canonical element in the HTML",
        { count: hrefs.length }
      );
    }
    const distinct = [...new Set(hrefs.map(normalizeUrl4))];
    if (distinct.length > 1) {
      return fail(
        "core-canonical-multiple",
        `${hrefs.length} canonical elements specify different URLs: ${hrefs.join(", ")}`,
        {
          count: hrefs.length,
          hrefs,
          match: false,
          impact: "Conflicting canonical URLs may cause search engines to ignore the canonical instruction entirely",
          recommendation: 'Keep a single <link rel="canonical"> element pointing at the correct URL'
        }
      );
    }
    return warn(
      "core-canonical-multiple",
      `${hrefs.length} identical canonical elements found ("${hrefs[0]}")`,
      {
        count: hrefs.length,
        hrefs,
        match: true,
        impact: "Duplicate canonicals are in agreement but make future configuration errors likely",
        recommendation: "Specify the canonical only once per page"
      }
    );
  }
});
