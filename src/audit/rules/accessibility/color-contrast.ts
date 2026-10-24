import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const colorContrastRule = defineRule({
  id: "a11y-color-contrast",
  name: "Color Contrast",
  description: "Checks for potential color contrast issues",
  category: "a11y",
  weight: 8,
  run: (context) => {
    const { $ } = context;
    const issues: { element: string; issue: string; }[] = [];
    const examined = $('[style*="color"], [style*="background-image"]').length;
    if (examined === 0) {
      return notMeasured(
        "a11y-color-contrast",
        "No inline colours to check; contrast set in stylesheets needs a rendered check"
      );
    }
    $('[style*="color"]').each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
      if (colorMatch && bgMatch) {
        const color = colorMatch[1].trim().toLowerCase();
        const bg = bgMatch[1].trim().toLowerCase();
        if (isLowContrastPair(color, bg)) {
          const tag = el.tagName?.toLowerCase() || "element";
          const id = $el.attr("id");
          const selector = id ? `${tag}#${id}` : tag;
          issues.push({
            element: selector,
            issue: `Potential low contrast: ${color} on ${bg}`
          });
        }
      }
    });
    $('[style*="color"]').each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      if (colorMatch) {
        const color = colorMatch[1].trim().toLowerCase();
        if (isLightGray(color)) {
          const text = $el.text().trim();
          if (text.length > 0 && text.length < 100) {
            issues.push({
              element: `Text: "${text.slice(0, 30)}..."`,
              issue: `Light gray text (${color}) may have insufficient contrast`
            });
          }
        }
      }
    });
    $('[style*="background-image"]').each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      const text = $el.text().trim();
      if (text.length > 0 && !style.includes("background-color")) {
        const tag = el.tagName?.toLowerCase() || "element";
        issues.push({
          element: tag,
          issue: "Text on background image without fallback background-color"
        });
      }
    });
    if (issues.length === 0) {
      return pass("a11y-color-contrast", "No obvious color contrast issues detected", {
        note: "Full WCAG contrast checking requires visual rendering"
      });
    }
    return warn("a11y-color-contrast", `Found ${issues.length} potential contrast issue(s)`, {
      issues: issues.slice(0, 10),
      totalIssues: issues.length,
      note: "These are heuristic detections; verify with a visual contrast checker"
    });
  }
});
export function isLowContrastPair(color: string, bg: string) {
  const c = normalizeColor(color);
  const b = normalizeColor(bg);
  const lowContrastPairs = [
    ["white", "white"],
    ["black", "black"],
    ["gray", "gray"],
    ["lightgray", "white"],
    ["silver", "white"],
    ["yellow", "white"],
    ["cyan", "white"],
    ["lime", "white"],
    ["darkgray", "black"],
    ["navy", "black"],
    ["darkblue", "black"]
  ];
  for (const [a, b2] of lowContrastPairs) {
    if (c.includes(a) && b.includes(b2) || c.includes(b2) && b.includes(a)) {
      return true;
    }
  }
  return false;
}
export function isLightGray(color: string) {
  const c = color.toLowerCase();
  if (["lightgray", "lightgrey", "silver", "gainsboro"].includes(c)) {
    return true;
  }
  if (/^#[a-f]{3}$/i.test(c) || /^#[a-f]{6}$/i.test(c)) {
    return true;
  }
  const rgbMatch = c.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 150) {
      return true;
    }
  }
  return false;
}
export function normalizeColor(color: string) {
  return color.toLowerCase().replace(/\s+/g, "");
}
