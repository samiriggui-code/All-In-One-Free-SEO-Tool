import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const CORRECT_INITIAL_SCALE = 1;
export const viewportContentRule = defineRule({
  id: "mobile-viewport-content",
  name: "Viewport Meta Content",
  description: "Checks the viewport meta tag for width, initial-scale, and minimum-scale directives",
  category: "mobile",
  weight: 10,
  run: (context) => {
    const { $ } = context;
    const viewport = $('meta[name="viewport"]').first().attr("content");
    if (!viewport) {
      return notMeasured(
        "mobile-viewport-content",
        "No viewport meta tag present; content directives cannot be checked (handled by viewport-present rule)",
        { viewportFound: false }
      );
    }
    const directives = /* @__PURE__ */ new Map();
    for (const part of viewport.split(",")) {
      const [key, ...rest] = part.split("=");
      const name = key?.trim().toLowerCase();
      if (name) {
        directives.set(name, rest.join("=").trim());
      }
    }
    const issues = [];
    if (!directives.has("width")) {
      issues.push("width directive is missing");
    }
    const initialScale = directives.get("initial-scale");
    if (initialScale === void 0) {
      issues.push("initial-scale directive is missing");
    } else {
      const value = parseFloat(initialScale);
      if (isNaN(value) || value !== CORRECT_INITIAL_SCALE) {
        issues.push(`initial-scale is set to "${initialScale}" instead of 1`);
      }
    }
    if (directives.has("minimum-scale")) {
      issues.push("minimum-scale is set, limiting how far users can zoom out");
    }
    if (issues.length === 0) {
      return pass(
        "mobile-viewport-content",
        "Viewport meta tag sets width and initial-scale=1, with no minimum-scale",
        { viewportContent: viewport }
      );
    }
    return warn(
      "mobile-viewport-content",
      `Viewport meta tag has ${issues.length} content issue(s): ${issues.join("; ")}`,
      {
        viewportContent: viewport,
        issues,
        recommendation: 'Use <meta name="viewport" content="width=device-width, initial-scale=1">'
      }
    );
  }
});
