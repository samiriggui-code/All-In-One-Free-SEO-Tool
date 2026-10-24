import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const metaInBodyRule = defineRule({
  id: "content-meta-in-body",
  name: "Meta Tags in Body",
  description: "Detects meta tags incorrectly placed in document body",
  category: "content",
  weight: 8,
  run: async (context) => {
    const { $ } = context;
    const issues = [];
    $("body meta").each((_, el) => {
      const $el = $(el);
      if ($el.attr("itemprop") !== void 0) return;
      if ($el.attr("property") && $el.parents("[typeof], [vocab]").length > 0) return;
      const attribute = ["name", "property", "http-equiv", "charset"].find(
        (attr) => $el.attr(attr) !== void 0
      );
      const content = $el.attr("content")?.substring(0, 50);
      issues.push({
        tag: attribute ? `<meta ${attribute}="${$el.attr(attribute)}">` : "<meta>",
        content: content ? `${content}${content.length >= 50 ? "..." : ""}` : void 0
      });
    });
    const bodyTitle = $(`body ${DOCUMENT_TITLE}`);
    if (bodyTitle.length > 0) {
      issues.push({
        tag: "<title>",
        content: bodyTitle.first().text()?.substring(0, 50)
      });
    }
    $('body link[rel="canonical"]').each((_, el) => {
      issues.push({
        tag: '<link rel="canonical">',
        content: $(el).attr("href")?.substring(0, 50)
      });
    });
    $('body link[rel="icon"], body link[rel="shortcut icon"]').each((_, el) => {
      issues.push({
        tag: `<link rel="${$(el).attr("rel")}">`,
        content: $(el).attr("href")?.substring(0, 50)
      });
    });
    if (issues.length > 0) {
      return fail(
        "content-meta-in-body",
        `Found ${issues.length} meta element${issues.length > 1 ? "s" : ""} incorrectly placed in document body`,
        {
          issues,
          impact: "Meta tags in the body are ignored by browsers and search engines, causing SEO signals to be lost",
          recommendation: "Move all meta tags, title, and canonical link to the <head> section. Check for HTML template errors or dynamic rendering issues."
        }
      );
    }
    return pass(
      "content-meta-in-body",
      "All meta elements are correctly placed in document head",
      {
        checkedElements: ["<meta>", "<title>", '<link rel="canonical">', '<link rel="icon">']
      }
    );
  }
});
