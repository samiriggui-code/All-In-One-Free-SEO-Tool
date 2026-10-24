import type { CheerioAPI } from "cheerio";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function hasNoindex3($: CheerioAPI, headers: Record<string, string>) {
  const sources = [];
  const robotsMeta = $('meta[name="robots"]').attr("content") || "";
  if (/noindex/i.test(robotsMeta)) {
    sources.push('meta[name="robots"]');
  }
  const googlebotMeta = $('meta[name="googlebot"]').attr("content") || "";
  if (/noindex/i.test(googlebotMeta)) {
    sources.push('meta[name="googlebot"]');
  }
  const xRobotsTag = headers["x-robots-tag"] || headers["X-Robots-Tag"] || "";
  if (/noindex/i.test(xRobotsTag)) {
    sources.push("X-Robots-Tag header");
  }
  return { isNoindexed: sources.length > 0, sources };
}
export const paginationNoindexRule = defineRule({
  id: "crawl-pagination-noindex",
  name: "Pagination Noindex Check",
  description: "Checks if paginated pages have noindex directive",
  category: "crawl",
  weight: 6,
  run: async (context) => {
    const { $, headers } = context;
    const nextLink = $('link[rel="next"]').attr("href");
    const prevLink = $('link[rel="prev"]').attr("href");
    const isPaginated = !!(nextLink || prevLink);
    if (!isPaginated) {
      return pass(
        "crawl-pagination-noindex",
        'Page is not paginated (no rel="next"/"prev" links)',
        { isPaginated: false }
      );
    }
    const { isNoindexed, sources } = hasNoindex3($, headers);
    const details = {
      isPaginated: true,
      hasNext: !!nextLink,
      hasPrev: !!prevLink,
      isNoindexed,
      noindexSources: sources
    };
    if (isNoindexed) {
      return warn(
        "crawl-pagination-noindex",
        `Paginated page has noindex directive (via ${sources.join(", ")})`,
        {
          ...details,
          impact: "Noindexing paginated pages prevents content discovery and can break pagination series",
          recommendation: 'Remove noindex from paginated pages; use rel="canonical" to consolidate signals instead'
        }
      );
    }
    return pass(
      "crawl-pagination-noindex",
      "Paginated page is not noindexed (correct)",
      details
    );
  }
});
