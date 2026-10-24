import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { hasName } from "@/audit/rules/accessibility/button-name";

export const WARN_THRESHOLD3 = 1;
export const FAIL_THRESHOLD3 = 4;
export const brokenHtmlRule = defineRule({
  id: "content-broken-html",
  name: "Broken HTML",
  description: "Checks for malformed HTML structure issues",
  category: "content",
  weight: 4,
  run: async (context) => {
    const { $ } = context;
    const issues = [];
    const ids = /* @__PURE__ */ new Map();
    $("[id]").each((_, el) => {
      const id = $(el).attr("id");
      if (id) {
        const count = ids.get(id) || 0;
        ids.set(id, count + 1);
      }
    });
    for (const [id, count] of ids.entries()) {
      if (count > 1) {
        issues.push({
          type: "duplicate-id",
          element: `#${id}`,
          details: `ID "${id}" appears ${count} times (IDs must be unique)`
        });
      }
    }
    const inlineElements = ["a", "span", "em", "strong", "b", "i", "label"];
    const blockElements = ["div", "p", "section", "article", "ul", "ol", "table", "form"];
    for (const inline of inlineElements) {
      for (const block of blockElements) {
        const nested = $(`${inline} > ${block}`);
        if (nested.length > 0) {
          issues.push({
            type: "invalid-nesting",
            element: `<${inline}> > <${block}>`,
            details: `Block element <${block}> inside inline element <${inline}> (found ${nested.length})`
          });
        }
      }
    }
    const imagesWithoutSrc = $('img:not([src]), img[src=""]');
    if (imagesWithoutSrc.length > 0) {
      issues.push({
        type: "missing-attribute",
        element: "<img>",
        details: `${imagesWithoutSrc.length} image(s) without src attribute`
      });
    }
    const anchorsWithoutHref = $('a:not([href]), a[href=""]').filter((_, el) => {
      return !$(el).attr("name") && !$(el).attr("id");
    });
    if (anchorsWithoutHref.length > 0) {
      issues.push({
        type: "missing-attribute",
        element: "<a>",
        details: `${anchorsWithoutHref.length} anchor(s) without href attribute`
      });
    }
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      const text = $(el).text().trim();
      if (!text) {
        issues.push({
          type: "empty-element",
          element: `<${el.tagName?.toLowerCase()}>`,
          details: "Empty heading element"
        });
      }
    });
    $("button").each((_, el) => {
      if (!hasName($, el)) {
        issues.push({
          type: "empty-element",
          element: "<button>",
          details: "Empty button without accessible label"
        });
      }
    });
    $('input:not([type="hidden"]):not([type="submit"]):not([type="button"])').each(
      (_, el) => {
        const id = $(el).attr("id");
        const ariaLabel = $(el).attr("aria-label");
        const ariaLabelledBy = $(el).attr("aria-labelledby");
        const title = $(el).attr("title");
        const placeholder = $(el).attr("placeholder");
        const hasLabel2 = id ? $(`label[for="${id}"]`).length > 0 : false;
        const isWrappedInLabel = $(el).closest("label").length > 0;
        if (!hasLabel2 && !isWrappedInLabel && !ariaLabel && !ariaLabelledBy && !title) {
          if (!placeholder) {
            issues.push({
              type: "accessibility",
              element: "<input>",
              details: "Form input without label or accessible name"
            });
          }
        }
      }
    );
    const deprecatedElements = [
      "center",
      "font",
      "marquee",
      "blink",
      "strike",
      "big",
      "tt"
    ];
    for (const tag of deprecatedElements) {
      const found = $(tag);
      if (found.length > 0) {
        issues.push({
          type: "deprecated-element",
          element: `<${tag}>`,
          details: `Deprecated element found (${found.length} instance${found.length > 1 ? "s" : ""})`
        });
      }
    }
    const criticalCount = issues.filter(
      (i) => i.type === "duplicate-id" || i.type === "invalid-nesting"
    ).length;
    const minorCount = issues.length - criticalCount;
    const details = {
      issueCount: issues.length,
      criticalCount,
      minorCount,
      issues: issues.slice(0, 15),
      // Limit to first 15
      categories: {
        "duplicate-id": issues.filter((i) => i.type === "duplicate-id").length,
        "invalid-nesting": issues.filter((i) => i.type === "invalid-nesting").length,
        "missing-attribute": issues.filter((i) => i.type === "missing-attribute").length,
        "empty-element": issues.filter((i) => i.type === "empty-element").length,
        accessibility: issues.filter((i) => i.type === "accessibility").length,
        "deprecated-element": issues.filter((i) => i.type === "deprecated-element").length
      }
    };
    if (issues.length >= FAIL_THRESHOLD3) {
      return fail(
        "content-broken-html",
        `Significant HTML structure issues: ${issues.length} problems found`,
        {
          ...details,
          impact: "Malformed HTML can cause rendering issues, accessibility problems, and may confuse search engine parsers",
          recommendation: "Use an HTML validator to identify and fix structural issues. Prioritize duplicate IDs and nesting errors."
        }
      );
    }
    if (issues.length >= WARN_THRESHOLD3) {
      return warn(
        "content-broken-html",
        `HTML structure issues found: ${issues.length} problem${issues.length > 1 ? "s" : ""}`,
        {
          ...details,
          impact: "Minor HTML issues may affect accessibility or cause subtle rendering problems",
          recommendation: "Review and fix the identified issues. Modern browsers are forgiving, but search engine parsers may not be."
        }
      );
    }
    return pass("content-broken-html", "No significant HTML structure issues detected", {
      ...details,
      note: "HTML structure appears well-formed"
    });
  }
});
