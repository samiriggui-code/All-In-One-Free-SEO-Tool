import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import type { AnyNode, Cheerio } from "cheerio";

export const focusVisibleRule = defineRule({
  id: "a11y-focus-visible",
  name: "Focus Visible",
  description: "Checks for focus indicator styles",
  category: "a11y",
  weight: 8,
  run: (context) => {
    const { $ } = context;
    const issues: string[] = [];
    let hasOutlineNone = false;
    let hasFocusVisibleSupport = false;
    $('[style*="outline"]').each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      if (/outline\s*:\s*(none|0)/i.test(style)) {
        const tag = el.tagName?.toLowerCase() || "element";
        const id = $el.attr("id");
        const selector = id ? `${tag}#${id}` : tag;
        if (isInteractive($el)) {
          issues.push(`${selector} has outline:none inline style`);
          hasOutlineNone = true;
        }
      }
    });
    $("style").each((_, el) => {
      const cssContent = $(el).html() || "";
      if (/:focus\s*\{[^}]*outline\s*:\s*(none|0)/i.test(cssContent)) {
        hasOutlineNone = true;
        if (/:focus\s*\{[^}]*(box-shadow|border|background)/i.test(cssContent)) {
        } else {
          issues.push("Stylesheet removes focus outline without alternative");
        }
      }
      if (/:focus-visible/i.test(cssContent)) {
        hasFocusVisibleSupport = true;
      }
      if (/\*\s*\{[^}]*outline\s*:\s*(none|0)/i.test(cssContent)) {
        issues.push("Global selector removes all outlines");
        hasOutlineNone = true;
      }
      if (/(a|button|input|select|textarea)\s*\{[^}]*outline\s*:\s*(none|0)/i.test(cssContent)) {
        issues.push("Interactive element styles remove focus outline");
        hasOutlineNone = true;
      }
    });
    const customTabindex = $('[tabindex]:not([tabindex="-1"])').length;
    const externalStyles = $('link[rel="stylesheet"]').length;
    if (issues.length === 0 && !hasOutlineNone) {
      return pass("a11y-focus-visible", "No focus indicator issues detected", {
        hasFocusVisibleSupport,
        customTabindexElements: customTabindex,
        externalStylesheets: externalStyles,
        note: externalStyles > 0 ? "External stylesheets not analyzed" : void 0
      });
    }
    if (hasFocusVisibleSupport && issues.length <= 1) {
      return warn(
        "a11y-focus-visible",
        "Focus outline removed but :focus-visible detected",
        {
          issues,
          hasFocusVisibleSupport: true,
          recommendation: "Ensure :focus-visible provides clear focus indicators"
        }
      );
    }
    if (issues.length > 3) {
      return fail(
        "a11y-focus-visible",
        `Found ${issues.length} focus indicator issues`,
        {
          issues: issues.slice(0, 10),
          totalIssues: issues.length
        }
      );
    }
    return warn(
      "a11y-focus-visible",
      `Found ${issues.length} potential focus indicator issue(s)`,
      {
        issues,
        recommendation: "Ensure all interactive elements have visible focus indicators"
      }
    );
  }
});
export function isInteractive($el: Cheerio<AnyNode>) {
  const tag = $el.prop("tagName")?.toLowerCase();
  const role = $el.attr("role");
  const interactiveTags = ["a", "button", "input", "select", "textarea"];
  const interactiveRoles = ["button", "link", "checkbox", "radio", "tab", "menuitem"];
  if (interactiveTags.includes(tag || "")) {
    return true;
  }
  if (role && interactiveRoles.includes(role)) {
    return true;
  }
  const tabindex = $el.attr("tabindex");
  if (tabindex && tabindex !== "-1") {
    return true;
  }
  return false;
}
