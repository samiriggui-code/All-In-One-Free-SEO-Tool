import type { CheerioAPI } from "cheerio";
import { NON_CONTENT_SELECTOR, countWords2, extractMainContent } from "@/audit/rules/content/utils/text-extractor";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const MIN_LINKS_PER_100_WORDS = 0.5;
export const MAX_LINKS_PER_100_WORDS = 5;
export const MIN_WORDS_FOR_CHECK2 = 100;
export function contentLinks($: CheerioAPI, pageUrl: string) {
  const host = new URL(pageUrl).hostname;
  const found: { isInternal: boolean; }[] = [];
  $("body a[href]").each((_, el) => {
    if ($(el).closest(NON_CONTENT_SELECTOR).length > 0) return;
    try {
      const target = new URL($(el).attr("href") ?? "", pageUrl);
      if (target.protocol !== "http:" && target.protocol !== "https:") return;
      found.push({ isInternal: target.hostname === host });
    } catch {
    }
  });
  return found;
}
export const articleLinksRule = defineRule({
  id: "content-article-links",
  name: "Article Link Density",
  description: "Checks that articles have appropriate internal and external links based on length",
  category: "content",
  weight: 4,
  run: async (context) => {
    const { $, url } = context;
    const mainContent = extractMainContent($);
    const wordCount = countWords2(mainContent);
    if (wordCount < MIN_WORDS_FOR_CHECK2) {
      return pass(
        "content-article-links",
        `Content too short for link density check (${wordCount} words)`,
        {
          wordCount,
          linkCount: contentLinks($, url).length,
          skipped: true,
          reason: `Minimum ${MIN_WORDS_FOR_CHECK2} words required for meaningful link density analysis`
        }
      );
    }
    const links = contentLinks($, url);
    const totalLinks = links.length;
    const internalLinks = links.filter((l) => l.isInternal).length;
    const externalLinks = totalLinks - internalLinks;
    const linksPer100Words = totalLinks / wordCount * 100;
    const details = {
      wordCount,
      totalLinks,
      internalLinks,
      externalLinks,
      linksPer100Words: parseFloat(linksPer100Words.toFixed(2)),
      thresholds: {
        min: MIN_LINKS_PER_100_WORDS,
        max: MAX_LINKS_PER_100_WORDS
      }
    };
    if (linksPer100Words < MIN_LINKS_PER_100_WORDS) {
      const suggestedLinks = Math.ceil(
        wordCount * MIN_LINKS_PER_100_WORDS / 100
      );
      return warn(
        "content-article-links",
        `Link density too low: ${details.linksPer100Words} links per 100 words (minimum ${MIN_LINKS_PER_100_WORDS})`,
        {
          ...details,
          impact: "Sparse linking misses opportunities for internal SEO and external citations",
          recommendation: `Add more relevant links. For ${wordCount} words, aim for at least ${suggestedLinks} links. Include internal links to related content and external links to authoritative sources.`
        }
      );
    }
    if (linksPer100Words > MAX_LINKS_PER_100_WORDS) {
      return warn(
        "content-article-links",
        `Link density too high: ${details.linksPer100Words} links per 100 words (maximum ${MAX_LINKS_PER_100_WORDS})`,
        {
          ...details,
          impact: "Excessive linking can appear spammy and dilute page authority",
          recommendation: "Remove less relevant links. Focus on quality over quantity - each link should provide clear value to users."
        }
      );
    }
    return pass(
      "content-article-links",
      `Link density is appropriate: ${details.linksPer100Words} links per 100 words`,
      {
        ...details,
        recommendation: internalLinks === 0 ? "Consider adding internal links to related content" : externalLinks === 0 ? "Consider adding external links to authoritative sources" : "Good mix of internal and external links"
      }
    );
  }
});
