import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const multipleTitlesRule = defineRule({
  id: "htmlval-multiple-titles",
  name: "Single Title Element",
  description: "Checks that the document contains at most one <title> element",
  category: "htmlval",
  weight: 12,
  run: async (context) => {
    const { $ } = context;
    const titleCount = $(DOCUMENT_TITLE).length;
    if (titleCount <= 1) {
      return pass(
        "htmlval-multiple-titles",
        titleCount === 0 ? "No <title> element found (checked by core-title-present)" : "Document has a single <title> element",
        { count: titleCount }
      );
    }
    const titles: string[] = [];
    $(DOCUMENT_TITLE).each((_, el) => {
      titles.push($(el).text().trim());
    });
    return fail(
      "htmlval-multiple-titles",
      `Document has ${titleCount} <title> elements. Only one <title> is allowed per document`,
      { count: titleCount, titles }
    );
  }
});
