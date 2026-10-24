import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function normalizeText2(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
export const titleSameAsDescriptionRule = defineRule({
  id: "content-title-same-as-description",
  name: "Title Same as Meta Description",
  description: "Checks if the title tag and meta description contain identical text (they should differ)",
  category: "content",
  weight: 4,
  run: async (context) => {
    const { $ } = context;
    const title = $(DOCUMENT_TITLE).first().text().trim();
    const description = ($('meta[name="description"]').attr("content") || "").trim();
    if (!title || !description) {
      return pass(
        "content-title-same-as-description",
        "Title or meta description is missing (handled by other rules)",
        {
          title: title || null,
          description: description || null,
          reason: "skipped"
        }
      );
    }
    if (normalizeText2(title) === normalizeText2(description)) {
      return warn(
        "content-title-same-as-description",
        "Title tag and meta description are identical",
        {
          title,
          description,
          impact: "Identical title and description waste the SERP snippet and give searchers no additional context",
          recommendation: "Write a distinct meta description that expands on the title and encourages clicks from search results"
        }
      );
    }
    return pass(
      "content-title-same-as-description",
      "Title tag and meta description are different",
      { title, description }
    );
  }
});
