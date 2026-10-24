import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const touchTargetsRule = defineRule({
  id: "a11y-touch-targets",
  name: "Touch Targets",
  description: "Checks for minimum touch target sizing hints",
  category: "a11y",
  weight: 6,
  run: (context) => {
    const { $ } = context;
    const issues: { element: string; issue: string; }[] = [];
    const interactiveSelector = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
    $(interactiveSelector).each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      const widthMatch = style.match(/width\s*:\s*(\d+)(px|em|rem)?/i);
      const heightMatch = style.match(/height\s*:\s*(\d+)(px|em|rem)?/i);
      if (widthMatch || heightMatch) {
        const width = widthMatch ? parseSize(widthMatch[1], widthMatch[2]) : 44;
        const height = heightMatch ? parseSize(heightMatch[1], heightMatch[2]) : 44;
        if (width < 44 || height < 44) {
          const tag = el.tagName?.toLowerCase() || "element";
          const text = $el.text().trim().slice(0, 20);
          const id = $el.attr("id");
          issues.push({
            element: id ? `${tag}#${id}` : text ? `${tag}: "${text}"` : tag,
            issue: `Small dimensions: ${Math.round(width)}x${Math.round(height)}px (min 44x44)`
          });
        }
      }
      const hasNoText = !$el.text().trim();
      const hasIcon = $el.find('svg, i, .icon, [class*="icon"]').length > 0;
      const hasImage = $el.find("img").length > 0;
      if (hasNoText && (hasIcon || hasImage)) {
        const padding = style.match(/padding\s*:\s*(\d+)/i);
        if (padding && parseInt(padding[1], 10) < 10) {
          const tag = el.tagName?.toLowerCase() || "element";
          const ariaLabel = $el.attr("aria-label") || "unlabeled";
          issues.push({
            element: `${tag} (${ariaLabel})`,
            issue: "Icon-only button with minimal padding may have small touch target"
          });
        }
      }
    });
    $("style").each((_, el) => {
      const css = $(el).html() || "";
      for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const target = rule[1].split(",").map((s) => s.trim()).find(isInteractiveSubject);
        if (!target) continue;
        for (const prop of rule[2].matchAll(/(?<![-\w])(width|height)\s*:\s*(\d+)px/gi)) {
          const dimension = parseInt(prop[2], 10);
          if (dimension > 0 && dimension < 44) {
            issues.push({
              element: target,
              issue: `CSS sets small ${prop[1].toLowerCase()} (${dimension}px) on interactive elements`
            });
            break;
          }
        }
      }
    });
    $("a img, button img").each((_, el) => {
      const $img = $(el);
      const width = $img.attr("width");
      const height = $img.attr("height");
      if (width && height) {
        const w = parseInt(width, 10);
        const h = parseInt(height, 10);
        if (w > 0 && w < 44 || h > 0 && h < 44) {
          const alt = $img.attr("alt") || "image";
          issues.push({
            element: `img: ${alt}`,
            issue: `Image link/button is ${w}x${h}px (min 44x44)`
          });
        }
      }
    });
    if (issues.length === 0) {
      return pass("a11y-touch-targets", "No obvious touch target size issues detected", {
        note: "Full touch target analysis requires visual rendering"
      });
    }
    return warn(
      "a11y-touch-targets",
      `Found ${issues.length} potential touch target sizing issue(s)`,
      {
        issues: issues.slice(0, 10),
        totalIssues: issues.length,
        recommendation: "Ensure interactive elements are at least 44x44 CSS pixels",
        wcagReference: "WCAG 2.2 SC 2.5.5 Target Size (Enhanced, Level AAA): 44x44; SC 2.5.8 (Level AA): 24x24"
      }
    );
  }
});
export function isInteractiveSubject(selector: string) {
  const subject = selector.split(/[\s>+~]+/).filter(Boolean).pop() ?? "";
  if (/::?(before|after|placeholder|marker|selection|first-line|first-letter)\b/i.test(subject)) {
    return false;
  }
  return /^(a|button)(?![\w-])/i.test(subject) || /\.btn(?![\w-])/i.test(subject) || /\[role=["']?button/i.test(subject);
}
export function parseSize(value: string, unit: string) {
  const num = parseInt(value, 10);
  switch (unit?.toLowerCase()) {
    case "em":
    case "rem":
      return num * 16;
    // Approximate
    case "px":
    default:
      return num;
  }
}
