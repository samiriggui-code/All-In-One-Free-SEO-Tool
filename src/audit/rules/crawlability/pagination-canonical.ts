import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const PAGINATION_PARAMS = ["page", "p", "pg", "offset", "start", "paged"];
export function isPaginatedUrl(url: string) {
  try {
    const urlObj = new URL(url);
    for (const param of PAGINATION_PARAMS) {
      const value = urlObj.searchParams.get(param);
      if (value) {
        const pageNum = parseInt(value, 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          return { isPaginated: true, pageNumber: pageNum, param };
        }
      }
    }
    const pathMatch = urlObj.pathname.match(/\/page\/(\d+)\/?$|\/(\d+)\/?$/);
    if (pathMatch) {
      const pageNum = parseInt(pathMatch[1] || pathMatch[2], 10);
      if (!isNaN(pageNum) && pageNum > 1) {
        return { isPaginated: true, pageNumber: pageNum, param: "path" };
      }
    }
    return { isPaginated: false };
  } catch {
    return { isPaginated: false };
  }
}
export function normalizeUrl6(url: string) {
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
export const paginationCanonicalRule = defineRule({
  id: "crawl-pagination-canonical",
  name: "Pagination Canonical",
  description: "Checks that paginated pages have self-referencing canonicals",
  category: "crawl",
  weight: 10,
  run: async (context) => {
    const { $, url } = context;
    const paginationInfo = isPaginatedUrl(url);
    const prevLink = $('link[rel="prev"]').attr("href");
    const nextLink = $('link[rel="next"]').attr("href");
    const hasPaginationLinks = !!(prevLink || nextLink);
    const canonical = $('link[rel="canonical"]').attr("href");
    if (!paginationInfo.isPaginated && !hasPaginationLinks) {
      return pass(
        "crawl-pagination-canonical",
        "Page does not appear to be paginated",
        {
          isPaginated: false,
          hasPaginationLinks: false
        }
      );
    }
    const details = {
      isPaginated: paginationInfo.isPaginated,
      pageNumber: paginationInfo.pageNumber,
      paginationMethod: paginationInfo.param,
      hasPrevLink: !!prevLink,
      hasNextLink: !!nextLink,
      canonical: canonical || null,
      currentUrl: url
    };
    if (!canonical) {
      return warn(
        "crawl-pagination-canonical",
        "Paginated page is missing canonical tag",
        {
          ...details,
          recommendation: "Add a self-referencing canonical tag to this paginated page"
        }
      );
    }
    const normalizedUrl = normalizeUrl6(url);
    const normalizedCanonical = normalizeUrl6(canonical);
    if (normalizedUrl === normalizedCanonical) {
      return pass(
        "crawl-pagination-canonical",
        "Paginated page has self-referencing canonical (correct)",
        details
      );
    }
    const canonicalPagination = isPaginatedUrl(canonical);
    const pointsToPageOne = !canonicalPagination.isPaginated || canonicalPagination.pageNumber === 1;
    if (pointsToPageOne && paginationInfo.pageNumber && paginationInfo.pageNumber > 1) {
      return fail(
        "crawl-pagination-canonical",
        `Paginated page ${paginationInfo.pageNumber} canonicalizes to page 1 (incorrect)`,
        {
          ...details,
          issue: "Paginated pages should NOT all canonicalize to page 1",
          recommendation: "Each paginated page should have a self-referencing canonical"
        }
      );
    }
    return warn(
      "crawl-pagination-canonical",
      "Paginated page canonical does not match current URL",
      {
        ...details,
        recommendation: "Verify this is intentional; typically each paginated page should self-reference"
      }
    );
  }
});
