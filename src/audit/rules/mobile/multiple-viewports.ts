import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const multipleViewportsRule = defineRule({
  id: "mobile-multiple-viewports",
  name: "Multiple Viewport Tags",
  description: "Checks for multiple viewport meta tags which can cause confusion",
  category: "mobile",
  weight: 8,
  run: (context) => {
    const { $ } = context;
    const viewportTags = $('meta[name="viewport"]');
    const count = viewportTags.length;
    if (count <= 1) {
      return pass(
        "mobile-multiple-viewports",
        count === 0 ? "No viewport meta tags found (handled by viewport-present rule)" : "Single viewport meta tag found (correct)",
        { viewportCount: count }
      );
    }
    const viewportContents: string[] = [];
    viewportTags.each((_, el) => {
      const content = $(el).attr("content") || "(empty)";
      viewportContents.push(content);
    });
    return fail(
      "mobile-multiple-viewports",
      `Found ${count} viewport meta tags; browsers use the last one, which can cause unexpected behavior`,
      {
        viewportCount: count,
        viewportContents,
        recommendation: 'Remove duplicate viewport meta tags; keep only one with content="width=device-width, initial-scale=1"'
      }
    );
  }
});
