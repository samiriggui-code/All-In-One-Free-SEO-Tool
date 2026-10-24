import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const GENERIC_PATTERNS2 = [
  // Numeric IDs
  /^\/?\d+$/,
  /^\/?(p|post|page|article|product|item|id)[-_]?\d+$/i,
  /^\/?\w+[-_]?\d{4,}$/i,
  // word followed by 4+ digits
  // UUID patterns
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  // Hash-like patterns
  /^\/?\w*[0-9a-f]{16,}\w*$/i,
  // Common generic slugs
  /^\/?untitled(-\d+)?$/i,
  /^\/?new-page(-\d+)?$/i,
  /^\/?copy(-of)?(-\d+)?$/i
];
export const DYNAMIC_PATTERNS = [
  // Query-based content
  /^\/?(\?|#)/,
  /\.(php|asp|aspx|jsp|cgi)\?/i,
  // Common CMS patterns with IDs
  /^\/?node\/\d+$/i,
  /^\/?\?p=\d+$/i,
  /^\/?index\.(php|html?)(\?|$)/i
];
export const MIN_SLUG_LENGTH = 3;
export function isDescriptiveSlug(slug: string) {
  if (slug.length < MIN_SLUG_LENGTH) {
    return false;
  }
  if (/^\d+$/.test(slug)) {
    return false;
  }
  if (/^[0-9a-f]{8,}$/i.test(slug) && !/[g-zG-Z]/.test(slug)) {
    return false;
  }
  return /[a-zA-Z]{2,}/.test(slug);
}
export function analyzeSlug(url: string) {
  const issues = [];
  try {
    const urlObj = new URL(url);
    const path3 = urlObj.pathname;
    const fullUrl = path3 + urlObj.search;
    for (const pattern of DYNAMIC_PATTERNS) {
      if (pattern.test(fullUrl)) {
        return {
          path: path3,
          slugs: [],
          hasDescriptiveSlug: false,
          isGeneric: false,
          isDynamic: true,
          issues: ["URL uses dynamic parameters instead of descriptive slugs"]
        };
      }
    }
    for (const pattern of GENERIC_PATTERNS2) {
      if (pattern.test(path3)) {
        return {
          path: path3,
          slugs: [],
          hasDescriptiveSlug: false,
          isGeneric: true,
          isDynamic: false,
          issues: ["URL uses generic identifiers instead of descriptive keywords"]
        };
      }
    }
    const segments = path3.split("/").filter((s) => s.length > 0).map((s) => s.replace(/\.[^.]+$/, ""));
    if (segments.length === 0) {
      return {
        path: path3,
        slugs: [],
        hasDescriptiveSlug: true,
        isGeneric: false,
        isDynamic: false,
        issues: []
      };
    }
    const descriptiveSegments = segments.filter(isDescriptiveSlug);
    const hasDescriptiveSlug = descriptiveSegments.length > 0;
    if (!hasDescriptiveSlug) {
      issues.push("URL path lacks descriptive keywords");
    }
    return {
      path: path3,
      slugs: segments,
      hasDescriptiveSlug,
      isGeneric: false,
      isDynamic: false,
      issues
    };
  } catch {
    return {
      path: url,
      slugs: [],
      hasDescriptiveSlug: false,
      isGeneric: false,
      isDynamic: false,
      issues: ["Could not parse URL"]
    };
  }
}
export const slugKeywordsRule = defineRule({
  id: "url-slug-keywords",
  name: "Slug Keywords",
  description: "Checks if URL slug contains relevant keywords rather than generic identifiers",
  category: "url",
  weight: 15,
  run: async (context) => {
    const { url } = context;
    const analysis = analyzeSlug(url);
    const details = {
      url,
      path: analysis.path,
      slugSegments: analysis.slugs,
      hasDescriptiveSlug: analysis.hasDescriptiveSlug,
      isGeneric: analysis.isGeneric,
      isDynamic: analysis.isDynamic
    };
    if (analysis.isDynamic) {
      return fail(
        "url-slug-keywords",
        analysis.issues[0] || "URL uses dynamic parameters instead of descriptive slugs",
        details
      );
    }
    if (analysis.isGeneric) {
      return fail(
        "url-slug-keywords",
        analysis.issues[0] || "URL uses generic identifiers instead of keywords",
        details
      );
    }
    if (analysis.hasDescriptiveSlug) {
      return pass(
        "url-slug-keywords",
        `URL contains descriptive keywords: ${analysis.slugs.join("/")}`,
        details
      );
    }
    return warn(
      "url-slug-keywords",
      "URL path may lack descriptive keywords",
      details
    );
  }
});
