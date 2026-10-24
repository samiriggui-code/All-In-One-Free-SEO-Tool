import type { CheerioAPI, Element } from "cheerio";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const INTERACTIVE_SELECTORS = [
  "button:not([aria-label]):not([aria-labelledby])",
  "a[href]:not([aria-label]):not([aria-labelledby])",
  'input:not([type="hidden"]):not([aria-label]):not([aria-labelledby])',
  "select:not([aria-label]):not([aria-labelledby])",
  "textarea:not([aria-label]):not([aria-labelledby])",
  '[role="button"]:not([aria-label]):not([aria-labelledby])',
  '[role="link"]:not([aria-label]):not([aria-labelledby])',
  '[role="checkbox"]:not([aria-label]):not([aria-labelledby])',
  '[role="radio"]:not([aria-label]):not([aria-labelledby])',
  '[role="tab"]:not([aria-label]):not([aria-labelledby])',
  '[role="menuitem"]:not([aria-label]):not([aria-labelledby])',
  '[role="option"]:not([aria-label]):not([aria-labelledby])'
];
export function hasAccessibleName($: CheerioAPI, el: Element) {
  const $el = $(el);
  const textContent = $el.text().trim();
  if (textContent.length > 0) {
    return true;
  }
  if ($el.attr("title")?.trim()) {
    return true;
  }
  if ($el.is('input[type="submit"], input[type="button"], input[type="reset"]')) {
    if ($el.attr("value")?.trim()) {
      return true;
    }
  }
  const id = $el.attr("id");
  if (id) {
    const label = $(`label[for="${id}"]`);
    if (label.length > 0 && label.text().trim()) {
      return true;
    }
  }
  const parentLabel = $el.closest("label");
  if (parentLabel.length > 0 && parentLabel.text().trim()) {
    return true;
  }
  if ($el.attr("aria-label")?.trim() || $el.attr("aria-labelledby")?.trim()) {
    return true;
  }
  const imgAlt = $el.find("img[alt]").first().attr("alt")?.trim();
  if (imgAlt) {
    return true;
  }
  const svgTitle = $el.find("svg title").first().text().trim();
  if (svgTitle) {
    return true;
  }
  return false;
}
export const ariaLabelsRule = defineRule({
  id: "a11y-aria-labels",
  name: "ARIA Labels",
  description: "Checks that interactive elements have accessible names",
  category: "a11y",
  weight: 10,
  run: (context) => {
    const { $ } = context;
    const missingLabels: {
tag: string; type: string|undefined; id: string|undefined; class: string|undefined;
// First class only
reason: string;
}[] = [];
    const checkedCount = { total: 0 };
    for (const selector of INTERACTIVE_SELECTORS) {
      $(selector).each((_, node) => {
        if (!("tagName" in node)) return;
        const el = node;
        checkedCount.total++;
        if (!hasAccessibleName($, el)) {
          const $el = $(el);
          const tag = el.tagName?.toLowerCase() || "unknown";
          missingLabels.push({
            tag,
            type: $el.attr("type"),
            id: $el.attr("id"),
            class: $el.attr("class")?.split(" ")[0],
            // First class only
            reason: getReasonForElement(tag, $el.attr("role"))
          });
        }
      });
    }
    if (missingLabels.length === 0) {
      return pass("a11y-aria-labels", "All interactive elements have accessible names", {
        checkedElements: checkedCount.total
      });
    }
    const severity = missingLabels.length > 5 ? "fail" : "warn";
    const message = `Found ${missingLabels.length} interactive element(s) without accessible names`;
    if (severity === "fail") {
      return fail("a11y-aria-labels", message, {
        missingLabels: missingLabels.slice(0, 10),
        totalMissing: missingLabels.length,
        checkedElements: checkedCount.total
      });
    }
    return warn("a11y-aria-labels", message, {
      missingLabels: missingLabels.slice(0, 10),
      totalMissing: missingLabels.length,
      checkedElements: checkedCount.total
    });
  }
});
export function getReasonForElement(tag: string, role: string | undefined) {
  if (role) {
    return `Elements with role="${role}" need accessible names for screen readers`;
  }
  switch (tag) {
    case "button":
      return "Buttons need accessible names for screen readers";
    case "a":
      return "Links need accessible names to describe their destination";
    case "input":
      return "Form inputs need labels for screen readers";
    case "select":
      return "Select elements need labels to describe their purpose";
    case "textarea":
      return "Textareas need labels to describe their purpose";
    default:
      return "Interactive elements need accessible names";
  }
}
