import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const skipLinkRule = defineRule({
  id: "a11y-skip-link",
  name: "Skip Link",
  description: "Checks for skip-to-content link for keyboard navigation",
  category: "a11y",
  weight: 6,
  run: (context) => {
    const { $ } = context;
    const skipLinkPatterns = [
      /skip\s*(to)?\s*(main)?\s*content/i,
      /skip\s*(to)?\s*navigation/i,
      /skip\s*nav/i,
      /skip\s*to\s*main/i,
      /jump\s*to\s*content/i,
      /jump\s*to\s*main/i,
      /go\s*to\s*(main)?\s*content/i
    ];
    const commonTargets = [
      "#main",
      "#main-content",
      "#maincontent",
      "#content",
      "#page-content",
      "#primary",
      "#skip-target"
    ];
    let skipLinkFound = false;
    let skipLinkInfo = null;
    $('a[href^="#"]').slice(0, 15).each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      const text = $el.text().trim().toLowerCase();
      const ariaLabel = $el.attr("aria-label")?.toLowerCase() || "";
      const isSkipLink = skipLinkPatterns.some((p) => p.test(text) || p.test(ariaLabel)) || commonTargets.includes(href.toLowerCase());
      if (isSkipLink) {
        skipLinkFound = true;
        const targetId = href.slice(1);
        const targetExists = $(`#${targetId}`).length > 0;
        const style = $el.attr("style") || "";
        const classes = $el.attr("class") || "";
        const isVisuallyHidden = style.includes("position: absolute") || style.includes("left: -") || classes.includes("sr-only") || classes.includes("visually-hidden") || classes.includes("skip-link");
        skipLinkInfo = {
          text: text || ariaLabel,
          href,
          isVisible: !isVisuallyHidden
        };
        if (!targetExists) {
          skipLinkFound = false;
        }
        return false;
      }
    });
    if (!skipLinkFound) {
      $('[role="link"]').slice(0, 5).each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim().toLowerCase();
        const ariaLabel = $el.attr("aria-label")?.toLowerCase() || "";
        if (skipLinkPatterns.some((p) => p.test(text) || p.test(ariaLabel))) {
          skipLinkFound = true;
          skipLinkInfo = {
            text: text || ariaLabel,
            href: 'role="link"',
            isVisible: true
          };
          return false;
        }
      });
    }
    const hasMainLandmark = $('main, [role="main"]').length > 0;
    if (skipLinkFound && skipLinkInfo) {
      return pass("a11y-skip-link", "Skip link is present", {
        skipLink: skipLinkInfo,
        hasMainLandmark
      });
    }
    const navElements = $('nav, [role="navigation"]').length;
    const headerSize = $("header").text().trim().length;
    const isSimplePage = navElements === 0 && headerSize < 100;
    if (isSimplePage) {
      return pass("a11y-skip-link", "Page is simple enough that skip link may not be needed", {
        hasMainLandmark,
        navElements,
        note: "Simple pages without navigation may not require skip links"
      });
    }
    return warn(
      "a11y-skip-link",
      "No skip link found for keyboard navigation",
      {
        hasMainLandmark,
        recommendation: hasMainLandmark ? "Add a skip link pointing to your <main> element" : "Add <main> landmark and a skip link at the top of the page",
        example: '<a href="#main" class="skip-link">Skip to content</a>'
      }
    );
  }
});
