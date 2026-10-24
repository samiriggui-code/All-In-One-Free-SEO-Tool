import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const landmarkRegionsRule = defineRule({
  id: "a11y-landmark-regions",
  name: "Landmark Regions",
  description: "Checks for proper landmark regions (main, nav, header, footer)",
  category: "a11y",
  weight: 6,
  run: (context) => {
    const { $ } = context;
    const landmarks: Record<string, { type: string; count: number }> = {};
    const missing = [];
    const warnings = [];
    const mainElements = $('main, [role="main"]');
    if (mainElements.length === 0) {
      missing.push("main");
    } else {
      landmarks.main = { type: "main", count: mainElements.length };
      if (mainElements.length > 1) {
        warnings.push("Multiple <main> landmarks found (should be only one)");
      }
    }
    const navElements = $('nav, [role="navigation"]');
    if (navElements.length === 0) {
      missing.push("navigation");
    } else {
      landmarks.navigation = { type: "navigation", count: navElements.length };
      if (navElements.length > 1) {
        let labelled = 0;
        navElements.each((_, el) => {
          const $el = $(el);
          if ($el.attr("aria-label") || $el.attr("aria-labelledby") || $el.attr("title")) {
            labelled++;
          }
        });
        if (labelled < navElements.length) {
          warnings.push(
            `${navElements.length} nav landmarks found; ${navElements.length - labelled} lack labels`
          );
        }
      }
    }
    const headerElements = $('body > header, [role="banner"]');
    if (headerElements.length === 0) {
      const anyHeader = $("header").length;
      if (anyHeader > 0) {
        landmarks.banner = { type: "banner", count: anyHeader };
      } else {
        missing.push("banner/header");
      }
    } else {
      landmarks.banner = { type: "banner", count: headerElements.length };
    }
    const footerElements = $('body > footer, [role="contentinfo"]');
    if (footerElements.length === 0) {
      const anyFooter = $("footer").length;
      if (anyFooter > 0) {
        landmarks.contentinfo = { type: "contentinfo", count: anyFooter };
      } else {
        missing.push("contentinfo/footer");
      }
    } else {
      landmarks.contentinfo = { type: "contentinfo", count: footerElements.length };
    }
    const asideElements = $('aside, [role="complementary"]');
    if (asideElements.length > 0) {
      landmarks.complementary = { type: "complementary", count: asideElements.length };
    }
    const searchElements = $('[role="search"]');
    if (searchElements.length > 0) {
      landmarks.search = { type: "search", count: searchElements.length };
    }
    if (missing.length === 0 && warnings.length === 0) {
      return pass("a11y-landmark-regions", "All essential landmark regions present", {
        landmarks,
        recommendation: 'Consider adding role="search" to search forms'
      });
    }
    if (missing.includes("main")) {
      const others = missing.filter((name) => name !== "main");
      return warn(
        "a11y-landmark-regions",
        `Missing essential landmark: <main>${others.length > 0 ? `. Also missing: ${others.join(", ")}` : ""}`,
        {
          missing,
          landmarks,
          warnings,
          recommendation: "Add <main> landmark to wrap primary content"
        }
      );
    }
    const problems = [
      ...missing.length > 0 ? [`missing: ${missing.join(", ")}`] : [],
      ...warnings
    ];
    return warn(
      "a11y-landmark-regions",
      `Landmark issues: ${problems.join("; ")}`,
      {
        missing,
        landmarks,
        warnings,
        recommendation: "Add landmark regions for better screen reader navigation"
      }
    );
  }
});
