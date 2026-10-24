import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
export const titleSameAsH1Rule = defineRule({
  id: "content-title-same-as-h1",
  name: "Title Same as H1",
  description: "Checks if the title tag and H1 heading are identical (should differ for keyword variety)",
  category: "content",
  weight: 6,
  run: async (context) => {
    const { $ } = context;
    const title = $(DOCUMENT_TITLE).first().text().trim();
    const h1 = $("h1").first().text().trim();
    if (!title || !h1) {
      return pass(
        "content-title-same-as-h1",
        "Title or H1 is missing (handled by other rules)",
        {
          title: title || null,
          h1: h1 || null,
          reason: "skipped"
        }
      );
    }
    const normalizedTitle = normalizeText(title);
    const normalizedH1 = normalizeText(h1);
    if (normalizedTitle === normalizedH1) {
      return warn(
        "content-title-same-as-h1",
        "Title tag and H1 heading are identical",
        {
          title,
          h1,
          normalizedTitle,
          normalizedH1,
          impact: "Identical title and H1 miss an opportunity for keyword variety in SERPs",
          recommendation: "Differentiate the title from the H1. For example, add your brand name to the title or use a slightly different phrasing to target additional keywords."
        }
      );
    }
    return pass(
      "content-title-same-as-h1",
      "Title tag and H1 heading are different",
      {
        title,
        h1,
        normalizedTitle,
        normalizedH1
      }
    );
  }
});
