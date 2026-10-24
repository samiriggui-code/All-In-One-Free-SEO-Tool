import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const httpHttpsDuplicateRule = defineRule({
  id: "url-http-https-duplicate",
  name: "HTTP/HTTPS Canonical Mismatch",
  description: "Checks if the canonical URL uses a different protocol (HTTP vs HTTPS) than the page URL",
  category: "url",
  weight: 4,
  run: async (context) => {
    const { url, $ } = context;
    try {
      const canonicalHref = $('link[rel="canonical"]').attr("href");
      if (!canonicalHref || canonicalHref.trim() === "") {
        return pass(
          "url-http-https-duplicate",
          "No canonical URL specified (no protocol mismatch to check)",
          { url, canonical: null }
        );
      }
      const canonical = canonicalHref.trim();
      if (!canonical.startsWith("http://") && !canonical.startsWith("https://")) {
        return pass(
          "url-http-https-duplicate",
          "Canonical URL is relative (no protocol mismatch possible)",
          { url, canonical }
        );
      }
      const pageUrl = new URL(url);
      const canonicalUrl = new URL(canonical);
      if (pageUrl.protocol !== canonicalUrl.protocol) {
        return warn(
          "url-http-https-duplicate",
          `Canonical protocol (${canonicalUrl.protocol}//) differs from page protocol (${pageUrl.protocol}//)`,
          {
            url,
            pageProtocol: pageUrl.protocol,
            canonical,
            canonicalProtocol: canonicalUrl.protocol,
            fix: `Update canonical to use ${pageUrl.protocol}//: ${canonical.replace(canonicalUrl.protocol, pageUrl.protocol)}`
          }
        );
      }
      return pass(
        "url-http-https-duplicate",
        "Canonical URL protocol matches page URL protocol",
        {
          url,
          protocol: pageUrl.protocol,
          canonical
        }
      );
    } catch {
      return pass("url-http-https-duplicate", "Could not parse URL or canonical", {
        url
      });
    }
  }
});
