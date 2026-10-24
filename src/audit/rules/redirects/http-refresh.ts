import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const httpRefreshRule = defineRule({
  id: "redirect-http-refresh",
  name: "No HTTP Refresh Header",
  description: "Checks for the non-standard Refresh HTTP header that should use 301/302 status codes",
  category: "redirect",
  weight: 10,
  run: (context) => {
    const { headers } = context;
    const refreshHeader = headers["refresh"];
    if (!refreshHeader) {
      return pass("redirect-http-refresh", "No Refresh HTTP header present");
    }
    const delayMatch = refreshHeader.match(/^\s*(\d+)/);
    const delay = delayMatch ? parseInt(delayMatch[1], 10) : 0;
    const urlMatch = refreshHeader.match(/;\s*url\s*=\s*['"]?([^'">\s]+)/i);
    const targetUrl = urlMatch ? urlMatch[1] : void 0;
    return fail(
      "redirect-http-refresh",
      "Refresh HTTP header detected; use proper 301/302 status codes for redirects",
      {
        refreshHeader,
        delay,
        ...targetUrl && { targetUrl }
      }
    );
  }
});
