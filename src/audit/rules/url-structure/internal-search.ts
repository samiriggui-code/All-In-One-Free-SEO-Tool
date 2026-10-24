import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const SEARCH_PARAMS = /* @__PURE__ */ new Set([
  "q",
  "query",
  "search",
  "s",
  "keyword",
  "keywords",
  "search_query",
  "searchterm",
  "search_term",
  "terme",
  "buscar",
  "recherche",
  "suche"
]);
export const SEARCH_PATH_PATTERNS = [
  /\/search\/?$/i,
  /\/results\/?$/i,
  /\/search-results\/?$/i,
  /\/site-search\/?$/i
];
export const internalSearchRule = defineRule({
  id: "url-internal-search",
  name: "Internal Search URL",
  description: "Checks if the URL appears to be an internal search results page that should be noindexed",
  category: "url",
  weight: 4,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const params = urlObj.searchParams;
      let matchedParam = null;
      for (const key of params.keys()) {
        if (SEARCH_PARAMS.has(key.toLowerCase())) {
          matchedParam = key;
          break;
        }
      }
      let matchedPath = false;
      for (const pattern of SEARCH_PATH_PATTERNS) {
        if (pattern.test(pathname)) {
          matchedPath = true;
          break;
        }
      }
      if (matchedPath && matchedParam) {
        return warn(
          "url-internal-search",
          `URL appears to be an internal search page (path: ${pathname}, param: ${matchedParam})`,
          {
            url,
            path: pathname,
            searchParameter: matchedParam,
            searchValue: params.get(matchedParam) || "",
            fix: "Add noindex directive to prevent search result pages from being indexed"
          }
        );
      }
      if (matchedParam) {
        return warn(
          "url-internal-search",
          `URL may be an internal search page (param: ${matchedParam}=${params.get(matchedParam) || ""})`,
          {
            url,
            path: pathname,
            searchParameter: matchedParam,
            searchValue: params.get(matchedParam) || "",
            fix: "Add noindex directive to prevent search result pages from being indexed"
          }
        );
      }
      if (matchedPath && params.toString().length > 0) {
        return warn(
          "url-internal-search",
          `URL path suggests a search results page: ${pathname}`,
          {
            url,
            path: pathname,
            fix: "Add noindex directive if this is an internal search results page"
          }
        );
      }
      return pass(
        "url-internal-search",
        "URL does not appear to be an internal search page",
        { url }
      );
    } catch {
      return pass("url-internal-search", "Could not parse URL", { url });
    }
  }
});
