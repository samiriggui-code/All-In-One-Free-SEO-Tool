import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const MAX_SIZE_BYTES = 50 * 1024 * 1024;
export const WARN_SIZE_BYTES = 40 * 1024 * 1024;
export function formatBytes3(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} bytes`;
}
export const sitemapSizeLimitRule = defineRule({
  id: "crawl-sitemap-size-limit",
  name: "Sitemap Size Limit",
  description: "Checks if sitemap exceeds the 50 MB uncompressed size limit",
  category: "crawl",
  weight: 5,
  run: async (context) => {
    const { sitemapContent, sitemapDocuments } = context;
    if (!sitemapContent && !sitemapDocuments?.length) {
      return pass(
        "crawl-sitemap-size-limit",
        "No sitemap content available to check",
        { sitemapAvailable: false }
      );
    }
    const files = sitemapDocuments ? sitemapDocuments.filter((doc) => !doc.isIndex) : [{ url: "sitemap", bytes: Buffer.byteLength(sitemapContent ?? "", "utf8"), isIndex: false }];
    const skippedSitemaps = context.sitemapSkippedCount ?? 0;
    if (files.length === 0) {
      return notMeasured(
        "crawl-sitemap-size-limit",
        "The sitemap is an index, and none of the sitemaps it lists could be fetched",
        { sitemapsChecked: 0, skippedSitemaps }
      );
    }
    const largest = files.reduce((max, doc) => doc.bytes > max.bytes ? doc : max);
    const sizeBytes = largest.bytes;
    const fromIndex = sitemapDocuments?.some((doc) => doc.isIndex) ?? false;
    const subject = fromIndex || files.length > 1 ? `Sitemap ${largest.url}` : "Sitemap";
    const details = {
      sizeBytes,
      largestSitemap: largest.url,
      sitemapsChecked: files.length,
      skippedSitemaps,
      sizeFormatted: formatBytes3(sizeBytes),
      maxSizeBytes: MAX_SIZE_BYTES,
      maxSizeFormatted: formatBytes3(MAX_SIZE_BYTES)
    };
    if (sizeBytes > MAX_SIZE_BYTES) {
      return fail(
        "crawl-sitemap-size-limit",
        `${subject} is ${formatBytes3(sizeBytes)}, exceeding the 50 MB limit`,
        {
          ...details,
          impact: "Search engines will reject sitemaps exceeding 50 MB uncompressed",
          recommendation: "Split the sitemap into multiple smaller files using a sitemap index"
        }
      );
    }
    if (sizeBytes > WARN_SIZE_BYTES) {
      return warn(
        "crawl-sitemap-size-limit",
        `${subject} is ${formatBytes3(sizeBytes)}, approaching the 50 MB limit`,
        {
          ...details,
          recommendation: "Consider splitting into multiple sitemaps before reaching the limit"
        }
      );
    }
    return pass(
      "crawl-sitemap-size-limit",
      files.length > 1 ? `Largest of ${files.length} sitemaps is ${formatBytes3(sizeBytes)} (within 50 MB limit)` : `${subject} size is ${formatBytes3(sizeBytes)} (within 50 MB limit)`,
      details
    );
  }
});
