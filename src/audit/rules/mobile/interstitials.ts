import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const interstitialsRule = defineRule({
  id: "mobile-interstitials",
  name: "Intrusive Interstitials",
  description: "Detects potentially intrusive mobile popups and overlays",
  category: "mobile",
  weight: 10,
  run: (context) => {
    const { $ } = context;
    const issues: Array<{ element: string; type: string; evidence: string; }> = [];
    const popupPatterns = [
      /popup/i,
      /modal/i,
      /overlay/i,
      /lightbox/i,
      /interstitial/i,
      /newsletter/i,
      /subscribe/i,
      /exit-intent/i,
      /welcome-mat/i,
      /splash/i
    ];
    const acceptablePatterns = [
      /cookie/i,
      /consent/i,
      /gdpr/i,
      /privacy/i,
      /age-verification/i,
      /age-gate/i,
      /login/i,
      /auth/i
    ];
    $("[class], [id]").each((_, el) => {
      const $el = $(el);
      const className = ($el.attr("class") || "").toLowerCase();
      const id = ($el.attr("id") || "").toLowerCase();
      const combined = `${className} ${id}`;
      if (acceptablePatterns.some((pattern) => pattern.test(combined))) {
        return;
      }
      const isPopup = popupPatterns.some((pattern) => pattern.test(combined));
      if (isPopup) {
        const style = $el.attr("style") || "";
        const isFullScreen = style.includes("position: fixed") || style.includes("position:fixed") || className.includes("fixed") || className.includes("fullscreen") || className.includes("full-screen");
        const isOverlay = style.includes("z-index") || className.includes("overlay") || className.includes("backdrop");
        if (isFullScreen || isOverlay) {
          const tag = el.tagName?.toLowerCase() || "element";
          const matchedPattern = popupPatterns.find((p) => p.test(combined));
          issues.push({
            element: id ? `${tag}#${id}` : `${tag}.${className.split(" ")[0]}`,
            type: "Popup/Modal overlay",
            evidence: matchedPattern?.source || "popup-like styling"
          });
        }
      }
    });
    $("form").each((_, el) => {
      const $el = $(el);
      const action = ($el.attr("action") || "").toLowerCase();
      const className = ($el.attr("class") || "").toLowerCase();
      const text = $el.text().toLowerCase();
      const isNewsletter = action.includes("subscribe") || action.includes("newsletter") || action.includes("mailchimp") || action.includes("convertkit") || className.includes("subscribe") || className.includes("newsletter");
      if (isNewsletter) {
        const $parent = $el.closest('[class*="modal"], [class*="popup"], [class*="overlay"]');
        if ($parent.length > 0) {
          issues.push({
            element: "Newsletter signup form",
            type: "Newsletter popup",
            evidence: "Form inside modal/overlay container"
          });
        }
      }
      const hasEmailInput = $el.find('input[type="email"]').length > 0;
      const hasSubscribeButton = text.includes("subscribe") || text.includes("sign up") || text.includes("get updates");
      if (hasEmailInput && hasSubscribeButton) {
        const parentStyle = $el.parent().attr("style") || "";
        if (parentStyle.includes("position: fixed") || parentStyle.includes("z-index: 9")) {
          issues.push({
            element: "Email signup form",
            type: "Fixed position opt-in",
            evidence: "Fixed position email signup may be intrusive"
          });
        }
      }
    });
    $("script").each((_, el) => {
      const content = $(el).html() || "";
      if (content.includes("exitIntent") || content.includes("exit-intent") || content.includes("mouseout") && content.includes("document")) {
        issues.push({
          element: "script",
          type: "Exit-intent popup",
          evidence: "Exit-intent script detected"
        });
      }
      if ((content.includes("showModal") || content.includes("showPopup")) && (content.includes("DOMContentLoaded") || content.includes("$(document).ready") || content.includes("window.onload"))) {
        issues.push({
          element: "script",
          type: "On-load popup",
          evidence: "Script shows popup on page load"
        });
      }
    });
    $('[style*="position: fixed"], [style*="position:fixed"]').each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      const className = ($el.attr("class") || "").toLowerCase();
      if (className.includes("nav") || className.includes("header") || className.includes("cookie") || className.includes("consent")) {
        return;
      }
      const isAtTop = style.includes("top: 0") || style.includes("top:0") || !style.includes("bottom");
      const heightMatch = style.match(/height\s*:\s*(\d+)(vh|%|px)?/i);
      if (isAtTop && heightMatch) {
        const height = parseInt(heightMatch[1], 10);
        const unit = heightMatch[2]?.toLowerCase();
        if (unit === "vh" && height > 50 || unit === "%" && height > 50) {
          const tag = el.tagName?.toLowerCase() || "element";
          issues.push({
            element: tag,
            type: "Full-screen fixed element",
            evidence: `Fixed element covers ${height}${unit} of viewport`
          });
        }
      }
    });
    $('[class*="splash"], [id*="splash"]').each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      if (style.includes("position: fixed") || style.includes("position: absolute") || style.includes("z-index")) {
        const id = $el.attr("id") || "";
        const className = $el.attr("class") || "";
        issues.push({
          element: id ? `#${id}` : `.${className.split(" ")[0]}`,
          type: "Splash screen",
          evidence: "Splash screen may delay content access"
        });
      }
    });
    if (issues.length === 0) {
      return pass(
        "mobile-interstitials",
        "No intrusive interstitials detected",
        { note: "Static analysis - JavaScript-triggered popups may not be detected" }
      );
    }
    const criticalTypes = ["Exit-intent popup", "On-load popup", "Full-screen fixed element"];
    const criticalCount = issues.filter((i) => criticalTypes.includes(i.type)).length;
    if (criticalCount > 0) {
      return fail(
        "mobile-interstitials",
        `Found ${issues.length} potentially intrusive interstitial(s)`,
        {
          issues: issues.slice(0, 10),
          totalIssues: issues.length,
          criticalCount,
          recommendation: "Remove popups that cover main content on mobile. Use compact banners instead.",
          googleGuideline: "https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials"
        }
      );
    }
    return warn(
      "mobile-interstitials",
      `Found ${issues.length} potential interstitial issue(s)`,
      {
        issues: issues.slice(0, 10),
        totalIssues: issues.length,
        recommendation: "Review detected popups to ensure they don't cover main content on mobile"
      }
    );
  }
});
