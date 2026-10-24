import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const SEMANTIC_ELEMENTS = [
  "article",
  "section",
  "nav",
  "aside",
  "main",
  "header",
  "footer",
  "figure",
  "figcaption",
  "time",
  "mark",
  "details",
  "summary"
];
export const RECOMMENDED_ELEMENTS = ["main", "article", "header", "footer", "nav"];
export const semanticHtmlRule = defineRule({
  id: "geo-semantic-html",
  name: "Semantic HTML Structure",
  description: "Checks if the page uses semantic HTML5 elements that help AI systems understand content structure",
  category: "geo",
  weight: 25,
  run: (context) => {
    const { $ } = context;
    const found = [];
    const missing = [];
    const elementCounts: Record<string, number> = {};
    for (const element of SEMANTIC_ELEMENTS) {
      const count = $(element).length;
      if (count > 0) {
        found.push(element);
        elementCounts[element] = count;
      }
    }
    for (const element of RECOMMENDED_ELEMENTS) {
      if (!found.includes(element)) {
        missing.push(element);
      }
    }
    const distinctCount = found.length;
    const details = {
      found,
      foundCount: distinctCount,
      elementCounts,
      missingRecommended: missing,
      totalSemanticChecked: SEMANTIC_ELEMENTS.length
    };
    if (distinctCount >= 5) {
      return pass(
        "geo-semantic-html",
        `Excellent semantic HTML structure (${distinctCount} distinct semantic elements found)`,
        details
      );
    }
    if (distinctCount >= 3) {
      return warn(
        "geo-semantic-html",
        `Good semantic structure (${distinctCount} elements), could improve by adding: ${missing.join(", ") || "more semantic elements"}`,
        details
      );
    }
    return fail(
      "geo-semantic-html",
      `Poor semantic HTML - AI systems struggle to parse content (only ${distinctCount} semantic element(s) found)`,
      {
        ...details,
        recommendation: "Add semantic elements like <main>, <article>, <header>, <footer>, and <nav> to help AI understand your content structure"
      }
    );
  }
});
