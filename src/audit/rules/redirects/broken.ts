import { defineRule, fail, notMeasured, pass } from "@/audit/engine/define-rule";

export const brokenRedirectRule = defineRule({
  id: "redirect-broken",
  name: "No Broken Redirects",
  description: "Checks that redirect chains resolve to a valid (200) page",
  category: "redirect",
  weight: 15,
  run: (context) => {
    const redirectChain = context.redirectChain;
    if (!redirectChain || redirectChain.length === 0) {
      return notMeasured("redirect-broken", "Redirect chain was not recorded for this page");
    }
    const { statusCode } = context;
    if (statusCode >= 400) {
      const isClientError = statusCode >= 400 && statusCode < 500;
      const errorType = isClientError ? "client error" : "server error";
      return fail(
        "redirect-broken",
        `Redirect chain ends in ${statusCode} (${errorType}); the redirect destination is broken`,
        {
          finalStatusCode: statusCode,
          errorType,
          chainLength: redirectChain.length,
          chain: redirectChain.map((entry) => ({
            url: entry.url,
            statusCode: entry.statusCode
          }))
        }
      );
    }
    return pass("redirect-broken", "Redirect chain resolves to a valid page", {
      finalStatusCode: statusCode,
      chainLength: redirectChain.length
    });
  }
});
