import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { findOgTag } from "@/audit/rules/social/open-graph";

export function normalizeUrl5(urlString: string): string {
  try {
    const url = new URL(urlString);
    let normalized = `${url.protocol}//${url.hostname.toLowerCase()}`;
    if (url.port) {
      normalized += `:${url.port}`;
    }
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    normalized += pathname;
    if (url.search) {
      normalized += url.search;
    }
    return normalized;
  } catch {
    return urlString.toLowerCase();
  }
}
export const ogUrlCanonicalRule = defineRule({
  id: "social-og-url-canonical",
  name: "Open Graph URL Matches Canonical",
  description: "Checks that og:url matches the canonical URL for consistent SEO signals",
  category: "social",
  weight: 1,
  run: async (context) => {
    const { $ } = context;
    const ogUrl = findOgTag($, "og:url")?.content;
    const canonical = $('link[rel="canonical"]').first().attr("href")?.trim();
    if (!ogUrl && !canonical) {
      return warn(
        "social-og-url-canonical",
        "Neither og:url nor canonical URL found - add both for consistent SEO signals",
        { hasOgUrl: false, hasCanonical: false }
      );
    }
    if (!ogUrl && canonical) {
      return fail(
        "social-og-url-canonical",
        `Missing og:url - should match canonical: ${canonical}`,
        { hasOgUrl: false, hasCanonical: true, canonical }
      );
    }
    if (ogUrl && !canonical) {
      return warn(
        "social-og-url-canonical",
        "og:url exists but no canonical URL to compare against",
        { hasOgUrl: true, hasCanonical: false, ogUrl }
      );
    }
    const normalizedOgUrl = normalizeUrl5(ogUrl ?? "");
    const normalizedCanonical = normalizeUrl5(canonical ?? "");
    if (normalizedOgUrl === normalizedCanonical) {
      return pass(
        "social-og-url-canonical",
        "og:url matches canonical URL",
        {
          hasOgUrl: true,
          hasCanonical: true,
          ogUrl,
          canonical,
          match: true
        }
      );
    }
    return fail(
      "social-og-url-canonical",
      `og:url (${ogUrl}) does not match canonical URL (${canonical})`,
      {
        hasOgUrl: true,
        hasCanonical: true,
        ogUrl,
        canonical,
        normalizedOgUrl,
        normalizedCanonical,
        match: false
      }
    );
  }
});
