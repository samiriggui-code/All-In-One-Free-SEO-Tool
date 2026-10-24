import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const canonicalHeaderRule = defineRule({
  id: "core-canonical-header",
  name: "Canonical Header Validation",
  description: "Detects mismatch between HTML canonical tag and HTTP Link header",
  category: "core",
  weight: 7,
  run: async (context) => {
    const { $, headers } = context;
    const htmlCanonical = $('link[rel="canonical"]').first().attr("href")?.trim();
    const linkHeader = headers["link"] || headers["Link"] || "";
    let headerCanonical;
    if (linkHeader) {
      const canonicalMatch = linkHeader.match(/<([^>]+)>;\s*rel=["']?canonical["']?/i);
      if (canonicalMatch) {
        headerCanonical = canonicalMatch[1].trim();
      }
    }
    if (!htmlCanonical && !headerCanonical) {
      return pass(
        "core-canonical-header",
        "No conflicting canonical signals (neither HTML tag nor Link header present)",
        { htmlCanonical: null, headerCanonical: null }
      );
    }
    if (!htmlCanonical || !headerCanonical) {
      return pass(
        "core-canonical-header",
        "Single canonical signal present (no conflict)",
        {
          htmlCanonical: htmlCanonical || null,
          headerCanonical: headerCanonical || null,
          source: htmlCanonical ? "html" : "header"
        }
      );
    }
    const normalizeUrl13 = (url: string) => {
      try {
        const parsed = new URL(url);
        return parsed.href.replace(/\/$/, "").toLowerCase();
      } catch {
        return url.replace(/\/$/, "").toLowerCase();
      }
    };
    const normalizedHtml = normalizeUrl13(htmlCanonical);
    const normalizedHeader = normalizeUrl13(headerCanonical);
    if (normalizedHtml === normalizedHeader) {
      return pass(
        "core-canonical-header",
        "HTML canonical and Link header match",
        { htmlCanonical, headerCanonical, match: true }
      );
    }
    return warn(
      "core-canonical-header",
      `Canonical mismatch: HTML tag "${htmlCanonical}" differs from Link header "${headerCanonical}"`,
      {
        htmlCanonical,
        headerCanonical,
        match: false,
        recommendation: "Use HTML canonical tag exclusively; reserve Link header for non-HTML resources like PDFs"
      }
    );
  }
});
