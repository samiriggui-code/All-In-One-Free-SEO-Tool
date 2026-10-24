import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const SESSION_PATTERNS = [
  /[?&;]phpsessid=/i,
  /[?&;]jsessionid=/i,
  /[?&;]sid=/i,
  /[?&;]sessionid=/i,
  /[?&;]session_id=/i,
  /[?&;]aspsessionid/i,
  /[?&;]cfid=/i,
  /[?&;]cftoken=/i,
  /[?&;]zenid=/i,
  /;jsessionid=/i
];
export const PATH_SESSION_PATTERNS = [
  /\/phpsessid[=/]/i,
  /\/jsessionid[=/]/i,
  /;jsessionid=/i,
  /\/sid[=/][0-9a-f]{16,}/i,
  /\/session\/[0-9a-f-]{20,}/i
];
export const sessionIdsRule = defineRule({
  id: "url-session-ids",
  name: "Session IDs in URL",
  description: "Checks for session identifiers in the URL that cause duplicate content and security issues",
  category: "url",
  weight: 7,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const fullUrl = urlObj.pathname + urlObj.search;
      for (const pattern of SESSION_PATTERNS) {
        if (pattern.test(fullUrl)) {
          const matchSource = pattern.source.replace(/\[\\?&;]|=/gi, "").replace(/\//g, "");
          return fail(
            "url-session-ids",
            `Session ID found in URL (${matchSource})`,
            {
              url,
              path: urlObj.pathname,
              query: urlObj.search,
              matchedPattern: matchSource,
              fix: "Use cookies for session management instead of URL parameters"
            }
          );
        }
      }
      for (const pattern of PATH_SESSION_PATTERNS) {
        if (pattern.test(urlObj.pathname)) {
          return fail(
            "url-session-ids",
            "Session ID embedded in URL path",
            {
              url,
              path: urlObj.pathname,
              fix: "Use cookies for session management instead of URL path segments"
            }
          );
        }
      }
      return pass("url-session-ids", "No session IDs found in URL", {
        url
      });
    } catch {
      return pass("url-session-ids", "Could not parse URL", { url });
    }
  }
});
