import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export function normalizeUrl11(url: string) {
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
export const paginationLoopRule = defineRule({
  id: "crawl-pagination-loop",
  name: "Pagination Loop Detection",
  description: "Checks if pagination creates a loop by pointing back to the current page",
  category: "crawl",
  weight: 6,
  run: async (context) => {
    const { $, url } = context;
    const nextHref = $('link[rel="next"]').attr("href");
    const prevHref = $('link[rel="prev"]').attr("href");
    if (!nextHref && !prevHref) {
      return pass(
        "crawl-pagination-loop",
        'No pagination links found (rel="next"/"prev")',
        { hasPagination: false }
      );
    }
    const normalizedCurrentUrl = normalizeUrl11(url);
    const loops = [];
    if (nextHref) {
      try {
        const resolvedNext = new URL(nextHref, url).href;
        if (normalizeUrl11(resolvedNext) === normalizedCurrentUrl) {
          loops.push({ rel: "next", href: nextHref });
        }
      } catch {
      }
    }
    if (prevHref) {
      try {
        const resolvedPrev = new URL(prevHref, url).href;
        if (normalizeUrl11(resolvedPrev) === normalizedCurrentUrl) {
          loops.push({ rel: "prev", href: prevHref });
        }
      } catch {
      }
    }
    const details = {
      currentUrl: url,
      nextHref: nextHref || null,
      prevHref: prevHref || null,
      loops
    };
    if (loops.length > 0) {
      const loopRels = loops.map((l) => `rel="${l.rel}"`).join(" and ");
      return fail(
        "crawl-pagination-loop",
        `Pagination ${loopRels} points back to the current page (infinite loop)`,
        {
          ...details,
          impact: "Pagination loops waste crawl budget and prevent proper indexing of paginated series",
          recommendation: "Fix pagination links to point to the correct next/previous page in the series"
        }
      );
    }
    return pass(
      "crawl-pagination-loop",
      "Pagination links do not create a loop",
      details
    );
  }
});
