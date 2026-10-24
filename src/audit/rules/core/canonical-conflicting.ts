import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export function parseCanonicalFromLinkHeader(linkHeader: string) {
  const match = linkHeader.match(/<([^>]+)>;\s*rel=["']?canonical["']?/i);
  return match ? match[1].trim() : void 0;
}
export function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.replace(/\/$/, "").toLowerCase();
  }
}
export const canonicalConflictingRule = defineRule({
  id: "core-canonical-conflicting",
  name: "Conflicting Canonical URLs",
  description: "Checks if multiple canonical URLs are specified via HTML and HTTP header pointing to different URLs",
  category: "core",
  weight: 8,
  run: async (context) => {
    const { $, headers } = context;
    const htmlCanonical = $('link[rel="canonical"]').first().attr("href")?.trim();
    const linkHeader = headers["link"] || headers["Link"] || "";
    const headerCanonical = linkHeader ? parseCanonicalFromLinkHeader(linkHeader) : void 0;
    if (!htmlCanonical || !headerCanonical) {
      return pass(
        "core-canonical-conflicting",
        "No conflicting canonical URLs detected (at most one canonical source present)",
        {
          htmlCanonical: htmlCanonical || null,
          headerCanonical: headerCanonical || null
        }
      );
    }
    const normalizedHtml = normalizeUrl(htmlCanonical);
    const normalizedHeader = normalizeUrl(headerCanonical);
    if (normalizedHtml === normalizedHeader) {
      return pass(
        "core-canonical-conflicting",
        "HTML canonical and Link header canonical point to the same URL",
        {
          htmlCanonical,
          headerCanonical,
          match: true
        }
      );
    }
    return fail(
      "core-canonical-conflicting",
      `Conflicting canonical URLs: HTML tag specifies "${htmlCanonical}" but Link header specifies "${headerCanonical}"`,
      {
        htmlCanonical,
        headerCanonical,
        match: false,
        recommendation: 'Remove one canonical source to avoid conflicting signals; prefer the HTML <link rel="canonical"> tag'
      }
    );
  }
});
