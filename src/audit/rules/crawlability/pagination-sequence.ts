import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export function normalizeUrl12(url: string) {
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
export const paginationSequenceRule = defineRule({
  id: "crawl-pagination-sequence",
  name: "Pagination Sequence Validation",
  description: "Checks if pagination follows proper sequence (next and prev are different)",
  category: "crawl",
  weight: 5,
  run: async (context) => {
    const { $, url } = context;
    const nextHref = $('link[rel="next"]').attr("href");
    const prevHref = $('link[rel="prev"]').attr("href");
    if (!nextHref || !prevHref) {
      return pass(
        "crawl-pagination-sequence",
        nextHref || prevHref ? "Only one pagination direction present (sequence check not applicable)" : "No pagination links found",
        {
          hasNext: !!nextHref,
          hasPrev: !!prevHref
        }
      );
    }
    let resolvedNext;
    let resolvedPrev;
    try {
      resolvedNext = new URL(nextHref, url).href;
    } catch {
      return pass(
        "crawl-pagination-sequence",
        "Cannot validate sequence: next link URL is invalid",
        { nextHref, prevHref }
      );
    }
    try {
      resolvedPrev = new URL(prevHref, url).href;
    } catch {
      return pass(
        "crawl-pagination-sequence",
        "Cannot validate sequence: prev link URL is invalid",
        { nextHref, prevHref }
      );
    }
    const normalizedNext = normalizeUrl12(resolvedNext);
    const normalizedPrev = normalizeUrl12(resolvedPrev);
    const details = {
      currentUrl: url,
      nextHref,
      prevHref,
      resolvedNext,
      resolvedPrev
    };
    if (normalizedNext === normalizedPrev) {
      return fail(
        "crawl-pagination-sequence",
        "Pagination next and prev links point to the same URL (broken sequence)",
        {
          ...details,
          impact: "Search engines cannot determine the correct page ordering",
          recommendation: 'Ensure rel="next" and rel="prev" point to different pages in the series'
        }
      );
    }
    return pass(
      "crawl-pagination-sequence",
      "Pagination next and prev links point to different pages (correct sequence)",
      details
    );
  }
});
