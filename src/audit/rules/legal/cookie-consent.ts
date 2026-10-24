import { defineRule } from "@/audit/engine/define-rule";

export const CONSENT_PATTERNS = {
  // Common consent management platforms
  platforms: [
    "cookieyes",
    "onetrust",
    "cookiebot",
    "termly",
    "quantcast",
    "trustarc",
    "cookiepro",
    "iubenda",
    "osano",
    "civic-cookie",
    "cookie-law-info",
    "cookie-notice",
    "gdpr-cookie",
    "cookie-consent",
    "cookie-banner",
    "cookie-bar",
    "cookies-eu",
    "eucookie"
  ],
  // Class/ID patterns for consent elements
  elements: [
    /cookie[-_]?consent/i,
    /cookie[-_]?banner/i,
    /cookie[-_]?notice/i,
    /cookie[-_]?modal/i,
    /cookie[-_]?popup/i,
    /cookie[-_]?bar/i,
    /gdpr[-_]?consent/i,
    /gdpr[-_]?banner/i,
    /gdpr[-_]?notice/i,
    /consent[-_]?banner/i,
    /consent[-_]?modal/i,
    /consent[-_]?popup/i,
    /privacy[-_]?banner/i,
    /cc[-_]?banner/i,
    /cc[-_]?window/i
  ],
  // Button text patterns
  buttons: [
    /accept.*cookie/i,
    /accept.*all/i,
    /agree.*cookie/i,
    /cookie.*accept/i,
    /cookie.*agree/i,
    /cookie.*settings/i,
    /manage.*cookie/i,
    /customize.*cookie/i,
    /preferences/i,
    /decline.*cookie/i,
    /reject.*cookie/i
  ],
  // Script sources
  scripts: [
    "cookieyes.com",
    "onetrust.com",
    "cookiebot.com",
    "termly.io",
    "quantcast.com",
    "trustarc.com",
    "iubenda.com",
    "osano.com",
    "civiccomputing.com"
  ]
};
export const cookieConsentRule = defineRule({
  id: "legal-cookie-consent",
  name: "Cookie Consent",
  description: "Checks for cookie consent mechanism presence",
  category: "legal",
  weight: 15,
  run(context) {
    const { $ } = context;
    const detected: string[] = [];
    const issues = [];
    $("script[src]").each((_, el) => {
      const src = $(el).attr("src") || "";
      for (const platform of CONSENT_PATTERNS.scripts) {
        if (src.includes(platform)) {
          detected.push(`Script: ${platform}`);
          return;
        }
      }
    });
    const allElements = $("[class], [id]");
    allElements.each((_, el) => {
      const className = $(el).attr("class") || "";
      const id = $(el).attr("id") || "";
      const combined = `${className} ${id}`.toLowerCase();
      for (const platform of CONSENT_PATTERNS.platforms) {
        if (combined.includes(platform)) {
          detected.push(`Element: ${platform}`);
          return;
        }
      }
      for (const pattern of CONSENT_PATTERNS.elements) {
        if (pattern.test(combined)) {
          detected.push(`Element: ${combined.match(pattern)?.[0] || "consent element"}`);
          return;
        }
      }
    });
    $('button, a, [role="button"]').each((_, el) => {
      const text = $(el).text().trim();
      for (const pattern of CONSENT_PATTERNS.buttons) {
        if (pattern.test(text)) {
          detected.push(`Button: "${text.slice(0, 30)}..."`);
          return;
        }
      }
    });
    $("script:not([src])").each((_, el) => {
      const content = $(el).html() || "";
      if (/cookie.?consent|gdpr.?consent|accept.?cookies|cookie.?banner/i.test(content) && content.length < 5e4) {
        detected.push("Inline consent script");
        return false;
      }
    });
    const uniqueDetected = [...new Set(detected)];
    if (uniqueDetected.length > 0) {
      return {
        ruleId: "legal-cookie-consent",
        status: "pass",
        score: 100,
        message: `Cookie consent mechanism detected (${uniqueDetected.length} indicator${uniqueDetected.length > 1 ? "s" : ""})`,
        details: {
          detected: uniqueDetected.slice(0, 5),
          // Limit to 5 for readability
          hasConsent: true
        }
      };
    }
    const hasTracking = $('script[src*="googletagmanager"], script[src*="google-analytics"], script[src*="analytics"], script[src*="facebook"], script[src*="hotjar"], script[src*="mixpanel"]').length > 0;
    if (hasTracking) {
      issues.push("Tracking scripts detected but no cookie consent mechanism found");
      return {
        ruleId: "legal-cookie-consent",
        status: "warn",
        score: 50,
        message: "No cookie consent mechanism detected (tracking scripts present)",
        details: {
          hasConsent: false,
          hasTracking: true,
          issues
        }
      };
    }
    return {
      ruleId: "legal-cookie-consent",
      status: "pass",
      score: 100,
      message: "No cookie consent mechanism detected (may not be required if no tracking cookies used)",
      details: {
        hasConsent: false,
        hasTracking: false
      }
    };
  }
});
