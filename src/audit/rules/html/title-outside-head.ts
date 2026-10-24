import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const titleOutsideHeadRule = defineRule({
  id: "htmlval-title-outside-head",
  name: "Title Element Inside Head",
  description: "Checks that no <title> element appears outside of <head>",
  category: "htmlval",
  weight: 12,
  run: async (context) => {
    const { $ } = context;
    const outsideTitles: string[] = [];
    $(DOCUMENT_TITLE).each((_, el) => {
      if ($(el).closest("head").length === 0) {
        outsideTitles.push($(el).text().trim());
      }
    });
    if (outsideTitles.length === 0) {
      return pass(
        "htmlval-title-outside-head",
        $(DOCUMENT_TITLE).length === 0 ? "No <title> element found (checked by core-title-present)" : "All <title> elements are inside <head>",
        { count: $(DOCUMENT_TITLE).length }
      );
    }
    return fail(
      "htmlval-title-outside-head",
      `Found ${outsideTitles.length} <title> element(s) outside of <head>. Search engines may ignore a title that is not in <head>`,
      { count: outsideTitles.length, titles: outsideTitles }
    );
  }
});
