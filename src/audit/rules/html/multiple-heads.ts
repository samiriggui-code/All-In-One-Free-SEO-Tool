import { countHeadStartTags } from "@/audit/rules/html/head-source";
import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const multipleHeadsRule = defineRule({
  id: "htmlval-multiple-heads",
  name: "Single Head Element",
  description: "Checks that the document contains only one <head> element",
  category: "htmlval",
  weight: 10,
  run: async (context) => {
    const headCount = countHeadStartTags(context.html);
    if (headCount <= 1) {
      return pass(
        "htmlval-multiple-heads",
        "Document has a single <head> element",
        { count: headCount }
      );
    }
    return fail(
      "htmlval-multiple-heads",
      `Document has ${headCount} <head> elements. Only one <head> is allowed per document`,
      { count: headCount }
    );
  }
});
