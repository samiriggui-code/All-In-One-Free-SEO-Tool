import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export function validatePaginationUrl(href: string, baseUrl: string) {
  try {
    const resolved = new URL(href, baseUrl).href;
    return { valid: true, resolved };
  } catch {
    return { valid: false, error: `Invalid URL: "${href}"` };
  }
}
export const paginationBrokenRule = defineRule({
  id: "crawl-pagination-broken",
  name: "Pagination Broken Links",
  description: 'Checks if pagination rel="next"/"prev" links have valid URLs',
  category: "crawl",
  weight: 6,
  run: async (context) => {
    const { $, url } = context;
    const nextHref = $('link[rel="next"]').attr("href");
    const prevHref = $('link[rel="prev"]').attr("href");
    if (!nextHref && !prevHref) {
      return pass(
        "crawl-pagination-broken",
        'No pagination links found (rel="next"/"prev")',
        { hasPagination: false }
      );
    }
    const issues = [];
    const validLinks = [];
    if (nextHref) {
      const result = validatePaginationUrl(nextHref, url);
      if (result.valid) {
        validLinks.push({ rel: "next", href: nextHref, resolved: result.resolved });
      } else {
        issues.push({ rel: "next", href: nextHref, error: result.error });
      }
    }
    if (prevHref) {
      const result = validatePaginationUrl(prevHref, url);
      if (result.valid) {
        validLinks.push({ rel: "prev", href: prevHref, resolved: result.resolved });
      } else {
        issues.push({ rel: "prev", href: prevHref, error: result.error });
      }
    }
    const details = {
      nextHref: nextHref || null,
      prevHref: prevHref || null,
      validLinks,
      issues
    };
    if (issues.length > 0) {
      const brokenRels = issues.map((i) => `rel="${i.rel}"`).join(" and ");
      return fail(
        "crawl-pagination-broken",
        `Pagination ${brokenRels} link(s) have invalid URLs`,
        {
          ...details,
          impact: "Search engines cannot follow broken pagination links",
          recommendation: "Fix the pagination link URLs to use valid, absolute or relative URLs"
        }
      );
    }
    const validRels = validLinks.map((l) => `rel="${l.rel}"`).join(" and ");
    return pass(
      "crawl-pagination-broken",
      `Pagination ${validRels} link(s) have valid URLs`,
      details
    );
  }
});
