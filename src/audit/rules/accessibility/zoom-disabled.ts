import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const zoomDisabledRule = defineRule({
  id: "a11y-zoom-disabled",
  name: "Zoom Disabled",
  description: "Checks if viewport meta tag disables user zoom",
  category: "a11y",
  weight: 10,
  run: (context) => {
    const { $ } = context;
    const viewport = $('meta[name="viewport"]');
    if (viewport.length === 0) {
      return pass("a11y-zoom-disabled", "No viewport meta tag found", {
        note: "Consider adding viewport meta tag for mobile optimization"
      });
    }
    const content = viewport.attr("content") || "";
    const issues = [];
    const directives = parseViewportContent(content);
    if (directives["user-scalable"] === "no" || directives["user-scalable"] === "0") {
      issues.push("user-scalable=no prevents zooming");
    }
    const maxScale = parseFloat(directives["maximum-scale"] || "10");
    if (!isNaN(maxScale) && maxScale <= 1) {
      issues.push(`maximum-scale=${maxScale} prevents zoom beyond 100%`);
    }
    const minScale = parseFloat(directives["minimum-scale"] || "0");
    if (!isNaN(minScale) && !isNaN(maxScale) && minScale === 1 && maxScale === 1) {
      if (!issues.some((i) => i.includes("maximum-scale"))) {
        issues.push("Zoom is locked at 100% (minimum-scale and maximum-scale both 1)");
      }
    }
    if (issues.length === 0) {
      return pass("a11y-zoom-disabled", "Viewport allows user zoom", {
        viewport: content,
        userScalable: directives["user-scalable"] || "yes (default)",
        maximumScale: directives["maximum-scale"] || "not set"
      });
    }
    return fail("a11y-zoom-disabled", "Viewport meta tag prevents user zoom", {
      viewport: content,
      issues,
      wcagReference: "WCAG 2.1 SC 1.4.4 Resize Text (Level AA)",
      recommendation: "Remove user-scalable=no and ensure maximum-scale > 1 (or remove it entirely)",
      fixedViewport: "width=device-width, initial-scale=1"
    });
  }
});
export function parseViewportContent(content: string) {
  const directives: Record<string, string> = {};
  const parts = content.split(/[,;]/);
  for (const part of parts) {
    const [key, value] = part.split("=").map((s) => s.trim().toLowerCase());
    if (key) {
      directives[key] = value || "";
    }
  }
  return directives;
}
