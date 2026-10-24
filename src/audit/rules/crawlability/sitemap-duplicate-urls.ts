import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function normalizeUrl9(url: string) {
  try {
    const urlObj = new URL(url);
    let path3 = urlObj.pathname;
    if (path3.length > 1 && path3.endsWith("/")) {
      path3 = path3.slice(0, -1);
    }
    return `${urlObj.protocol}//${urlObj.host.toLowerCase()}${path3}${urlObj.search}`;
  } catch {
    return url.toLowerCase().replace(/\/$/, "");
  }
}
export const sitemapDuplicateUrlsRule = defineRule({
  id: "crawl-sitemap-duplicate-urls",
  name: "Sitemap Duplicate URLs",
  description: "Checks for duplicate URLs in sitemap",
  category: "crawl",
  weight: 6,
  run: async (context) => {
    const sitemapUrls = context.sitemapUrls;
    if (!sitemapUrls || sitemapUrls.length === 0) {
      return pass(
        "crawl-sitemap-duplicate-urls",
        "No sitemap URLs available to check",
        { sitemapAvailable: false }
      );
    }
    const seen = /* @__PURE__ */ new Set();
    const duplicates: string[] = [];
    for (const url of sitemapUrls) {
      const normalized = normalizeUrl9(url);
      if (seen.has(normalized)) {
        if (!duplicates.includes(normalized)) {
          duplicates.push(normalized);
        }
      } else {
        seen.add(normalized);
      }
    }
    const details = {
      totalUrls: sitemapUrls.length,
      uniqueUrls: seen.size,
      duplicateCount: duplicates.length,
      duplicates: duplicates.slice(0, 5)
    };
    if (duplicates.length > 0) {
      return warn(
        "crawl-sitemap-duplicate-urls",
        `Sitemap contains ${duplicates.length} duplicate URL(s)`,
        {
          ...details,
          impact: "Duplicate URLs waste crawl budget and may confuse crawl priority",
          recommendation: "Remove duplicate entries from the sitemap"
        }
      );
    }
    return pass(
      "crawl-sitemap-duplicate-urls",
      `All ${sitemapUrls.length} sitemap URLs are unique`,
      details
    );
  }
});
