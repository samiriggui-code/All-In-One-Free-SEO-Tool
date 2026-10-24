import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const IMPORTANT_CONTAINERS = /* @__PURE__ */ new Set([
  "header",
  "main",
  "article",
  "section",
  "hero",
  "banner"
]);
export const WARN_THRESHOLD2 = 2;
export const FAIL_THRESHOLD2 = 5;
export const backgroundSeoRule = defineRule({
  id: "images-background-seo",
  name: "Background Images SEO",
  description: "Checks for important images loaded as CSS background images (not crawlable by search engines)",
  category: "images",
  weight: 5,
  run: (context) => {
    const { $ } = context;
    const found: Array<{ tag: string; url: string; isImportant: boolean; }> = [];
    $('[style*="background-image"]').each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      const tag = el.tagName?.toLowerCase() || "unknown";
      const urlMatch = style.match(/background-image\s*:\s*url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/i);
      if (!urlMatch) {
        return;
      }
      const bgUrl = urlMatch[1].trim();
      if (bgUrl.startsWith("data:") || bgUrl.startsWith("linear-gradient") || bgUrl.startsWith("radial-gradient")) {
        return;
      }
      const isImportant = IMPORTANT_CONTAINERS.has(tag) || $el.closest('header, main, article, section, [role="banner"], [role="main"]').length > 0;
      found.push({ tag, url: bgUrl, isImportant });
    });
    if (found.length === 0) {
      return pass(
        "images-background-seo",
        "No inline CSS background images detected",
        { count: 0 }
      );
    }
    const importantCount = found.filter((item) => item.isImportant).length;
    const details = {
      totalCount: found.length,
      importantCount,
      examples: found.slice(0, 10).map((item) => ({
        tag: item.tag,
        url: item.url.length > 80 ? item.url.substring(0, 77) + "..." : item.url,
        isImportant: item.isImportant
      })),
      recommendation: "Use <img> tags with descriptive alt text for important visual content instead of CSS background-image"
    };
    if (found.length <= 1) {
      return pass(
        "images-background-seo",
        `Found ${found.length} inline CSS background image (minimal usage)`,
        details
      );
    }
    if (found.length > FAIL_THRESHOLD2) {
      return fail(
        "images-background-seo",
        `Found ${found.length} inline CSS background images; significant visual content may be invisible to search engine crawlers`,
        details
      );
    }
    if (found.length >= WARN_THRESHOLD2) {
      return warn(
        "images-background-seo",
        `Found ${found.length} inline CSS background images; these are not indexable by search engines`,
        details
      );
    }
    return pass(
      "images-background-seo",
      `Found ${found.length} inline CSS background image(s) (minimal usage)`,
      details
    );
  }
});
