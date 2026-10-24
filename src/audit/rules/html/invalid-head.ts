import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { headSource, startTags, withoutNoscript } from "@/audit/rules/html/head-source";

export const INVALID_HEAD_ELEMENTS = /* @__PURE__ */ new Set([
  "div",
  "span",
  "p",
  "section",
  "article",
  "img",
  "a",
  "table",
  "ul",
  "ol",
  "li",
  "form",
  "button",
  "input",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "main",
  "nav",
  "footer",
  "aside",
  "header"
]);
export const invalidHeadRule = defineRule({
  id: "htmlval-invalid-head",
  name: "Valid Head Elements",
  description: "Checks that <head> contains only valid metadata elements",
  category: "htmlval",
  weight: 10,
  run: async (context) => {
    const head = headSource(context.html);
    if (head === null) {
      return pass(
        "htmlval-invalid-head",
        "No <head> element found to validate"
      );
    }
    const invalidElements = [
      ...new Set(startTags(withoutNoscript(head)).filter((tag) => INVALID_HEAD_ELEMENTS.has(tag)))
    ];
    if (invalidElements.length > 0) {
      return warn(
        "htmlval-invalid-head",
        `<head> contains elements that belong in <body>: <${invalidElements.join(">, <")}>`,
        { invalidElements, count: invalidElements.length }
      );
    }
    return pass(
      "htmlval-invalid-head",
      "<head> contains only valid metadata elements"
    );
  }
});
