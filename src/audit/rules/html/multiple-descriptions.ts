import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const multipleDescriptionsRule = defineRule({
  id: "htmlval-multiple-descriptions",
  name: "Single Meta Description",
  description: 'Checks that the document contains at most one <meta name="description"> element',
  category: "htmlval",
  weight: 10,
  run: async (context) => {
    const { $ } = context;
    const descriptions = $('meta[name="description"]');
    const count = descriptions.length;
    if (count <= 1) {
      return pass(
        "htmlval-multiple-descriptions",
        count === 0 ? "No meta description found (checked by core-description-present)" : "Document has a single meta description",
        { count }
      );
    }
    const values: string[] = [];
    descriptions.each((_, el) => {
      values.push($(el).attr("content") || "");
    });
    return fail(
      "htmlval-multiple-descriptions",
      `Document has ${count} <meta name="description"> elements. Only one is allowed per document`,
      { count, descriptions: values }
    );
  }
});
