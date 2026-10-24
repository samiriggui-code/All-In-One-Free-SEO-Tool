import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const canonicalOutsideHeadRule = defineRule({
  id: "core-canonical-outside-head",
  name: "Canonical Outside Head",
  description: 'Checks that no <link rel="canonical"> element appears outside the <head>',
  category: "core",
  weight: 8,
  run: async (context) => {
    const { $ } = context;
    const outsideHrefs: string[] = [];
    $('link[rel="canonical"]').each((_, el) => {
      if ($(el).closest("head").length === 0) {
        outsideHrefs.push($(el).attr("href")?.trim() || "(no href)");
      }
    });
    if (outsideHrefs.length === 0) {
      return pass(
        "core-canonical-outside-head",
        "No canonical element outside the <head>",
        { outsideHead: 0 }
      );
    }
    return fail(
      "core-canonical-outside-head",
      `${outsideHrefs.length} canonical element(s) found outside the <head>: ${outsideHrefs.join(", ")}`,
      {
        outsideHead: outsideHrefs.length,
        hrefs: outsideHrefs,
        impact: "Canonical elements outside the <head> are ignored by search engines",
        recommendation: 'Move the <link rel="canonical"> element into the <head>'
      }
    );
  }
});
