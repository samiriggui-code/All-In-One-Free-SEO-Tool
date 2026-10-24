import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const CLIENT_ERROR_LABELS: Record<string, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  418: "I'm a Teapot",
  422: "Unprocessable Entity",
  423: "Locked",
  429: "Too Many Requests",
  451: "Unavailable For Legal Reasons"
};
export const fourXxNon404Rule = defineRule({
  id: "technical-4xx-non-404",
  name: "4xx Client Error Detection",
  description: "Checks for 4xx client errors other than 404 (e.g., 401, 403, 410, 429)",
  category: "technical",
  weight: 8,
  run: async (context) => {
    const { statusCode } = context;
    if (statusCode === 404) {
      return pass(
        "technical-4xx-non-404",
        "Page returns 404 (handled by dedicated 404 rules)",
        { statusCode }
      );
    }
    if (statusCode < 400 || statusCode >= 500) {
      return pass(
        "technical-4xx-non-404",
        "No client error detected",
        { statusCode }
      );
    }
    const label = CLIENT_ERROR_LABELS[statusCode] || "Client Error";
    if (statusCode === 401) {
      return fail(
        "technical-4xx-non-404",
        `Page requires authentication (401 ${label})`,
        {
          statusCode,
          label,
          fix: "Ensure public pages do not require authentication; if authentication is intentional, block the page from crawlers via robots.txt"
        }
      );
    }
    if (statusCode === 403) {
      return fail(
        "technical-4xx-non-404",
        `Page is forbidden (403 ${label})`,
        {
          statusCode,
          label,
          fix: "Check server permissions and access controls; if the page should be public, fix the configuration"
        }
      );
    }
    if (statusCode === 410) {
      return warn(
        "technical-4xx-non-404",
        `Page is permanently gone (410 ${label})`,
        {
          statusCode,
          label,
          fix: "Remove internal links pointing to this URL; 410 tells search engines the page is intentionally removed"
        }
      );
    }
    if (statusCode === 429) {
      return warn(
        "technical-4xx-non-404",
        `Rate limited (429 ${label})`,
        {
          statusCode,
          label,
          fix: "The server is rate limiting requests; consider increasing rate limits for search engine crawlers or reduce crawl concurrency"
        }
      );
    }
    return fail(
      "technical-4xx-non-404",
      `Page returned client error ${statusCode} ${label}`,
      {
        statusCode,
        label,
        fix: "Investigate and resolve the client error; ensure the page returns a proper response for search engines"
      }
    );
  }
});
