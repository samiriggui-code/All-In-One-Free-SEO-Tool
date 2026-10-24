import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { fetchPage } from "@/audit/crawler/fetcher";

export function generateRandomPath() {
  const randomId = Math.random().toString(36).substring(2, 15);
  return `/seo-audit-test-nonexistent-page-${randomId}-${Date.now()}`;
}
export function getBaseUrl5(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return url;
  }
}
export const DEFAULT_ERROR_SIGNATURES = [
  // Apache
  "apache",
  "not found",
  "the requested url",
  "was not found on this server",
  // Nginx
  "nginx",
  // IIS
  "internet information services",
  "iis",
  // Generic
  "error 404",
  "404 error",
  "404 not found",
  "page not found",
  "file not found",
  "not found"
];
export const CUSTOM_404_INDICATORS = [
  // Navigation elements
  "nav",
  "menu",
  "header",
  "footer",
  // Search functionality
  "search",
  // Links back to site
  "home",
  "homepage",
  "go back",
  "return",
  // Helpful content
  "sorry",
  "oops",
  "looking for",
  "help",
  "contact"
];
export function analyze404Page(html: string, _statusCode: number) {
  const lowerHtml = html.toLowerCase();
  const issues = [];
  const indicators = [];
  const hasDefaultSignatures = DEFAULT_ERROR_SIGNATURES.filter(
    (sig) => lowerHtml.includes(sig.toLowerCase())
  );
  const hasCustomIndicators = CUSTOM_404_INDICATORS.filter(
    (ind) => lowerHtml.includes(ind.toLowerCase())
  );
  const hasNavigation = /<nav[\s>]/i.test(html) || /<header[\s>]/i.test(html) || /<footer[\s>]/i.test(html) || /class=["'][^"']*nav/i.test(html) || /class=["'][^"']*menu/i.test(html);
  const textContent = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const hasSubstantialContent = textContent.length > 500;
  const hasTitle = /<title[^>]*>[^<]+<\/title>/i.test(html);
  let isCustom = false;
  if (hasNavigation) {
    indicators.push("Has navigation elements");
    isCustom = true;
  }
  if (hasSubstantialContent) {
    indicators.push("Has substantial content");
    isCustom = true;
  }
  if (hasCustomIndicators.length >= 3) {
    indicators.push(`Has ${hasCustomIndicators.length} helpful content indicators`);
    isCustom = true;
  }
  if (hasTitle) {
    indicators.push("Has title tag");
  }
  if (!hasNavigation) {
    issues.push("Missing navigation elements");
  }
  if (!hasSubstantialContent) {
    issues.push("Limited content on error page");
  }
  if (hasDefaultSignatures.length > 0 && !hasNavigation && !hasSubstantialContent) {
    issues.push("Appears to be a default server error page");
    isCustom = false;
  }
  const hasHelpfulContent = hasCustomIndicators.length >= 2;
  if (!hasHelpfulContent) {
    issues.push("Missing helpful content (search, suggestions, contact info)");
  }
  return {
    isCustom,
    hasNavigation,
    hasHelpfulContent,
    indicators,
    issues
  };
}
export const fourOhFourPageRule = defineRule({
  id: "technical-404-page",
  name: "Custom 404 Page",
  description: "Checks that the site has a custom 404 page (not a default server error)",
  category: "technical",
  weight: 1,
  run: async (context) => {
    const baseUrl = getBaseUrl5(context.url);
    const testPath = generateRandomPath();
    const testUrl = `${baseUrl}${testPath}`;
    try {
      const result = await fetchPage(testUrl);
      const { statusCode, html } = result;
      if (statusCode !== 404) {
        if (statusCode === 200) {
          return fail(
            "technical-404-page",
            `Non-existent page returned 200 instead of 404 (soft 404 issue)`,
            {
              testUrl,
              statusCode,
              issue: "Soft 404 - returns 200 for non-existent pages"
            }
          );
        }
        if (statusCode >= 300 && statusCode < 400) {
          return warn(
            "technical-404-page",
            `Non-existent page redirects (${statusCode}) instead of returning 404`,
            {
              testUrl,
              statusCode,
              issue: "Redirect on 404 - may cause crawl issues"
            }
          );
        }
        return warn(
          "technical-404-page",
          `Non-existent page returned ${statusCode} instead of 404`,
          {
            testUrl,
            statusCode
          }
        );
      }
      const analysis = analyze404Page(html, statusCode);
      const details = {
        testUrl,
        statusCode,
        isCustom: analysis.isCustom,
        hasNavigation: analysis.hasNavigation,
        hasHelpfulContent: analysis.hasHelpfulContent,
        indicators: analysis.indicators,
        issues: analysis.issues
      };
      if (analysis.isCustom) {
        return pass(
          "technical-404-page",
          "Site has a custom 404 page with proper navigation and content",
          details
        );
      }
      if (analysis.hasNavigation || analysis.hasHelpfulContent) {
        return warn(
          "technical-404-page",
          "404 page exists but could be improved",
          details
        );
      }
      return fail(
        "technical-404-page",
        "404 page appears to be a default server error page",
        details
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return fail(
        "technical-404-page",
        `Failed to test 404 page: ${message}`,
        { testUrl, error: message }
      );
    }
  }
});
