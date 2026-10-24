import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const PERMANENT_REDIRECTS = /* @__PURE__ */ new Set([301, 308]);
export const TEMPORARY_REDIRECTS = /* @__PURE__ */ new Set([302, 303, 307]);
export const redirectTypeRule = defineRule({
  id: "redirect-type",
  name: "Redirect Type",
  description: "Checks that redirects use permanent (301/308) status codes for SEO",
  category: "redirect",
  weight: 12,
  run: (context) => {
    const { redirectChain } = context;
    if (!redirectChain || redirectChain.length === 0) {
      return notMeasured("redirect-type", "Redirect chain was not recorded for this page");
    }
    const hops = redirectChain.filter(
      (entry) => PERMANENT_REDIRECTS.has(entry.statusCode) || TEMPORARY_REDIRECTS.has(entry.statusCode)
    );
    if (hops.length === 0) {
      return pass("redirect-type", "Page is not a redirect", {
        statusCode: context.statusCode
      });
    }
    const statusCodes = hops.map((entry) => entry.statusCode);
    const temporary = hops.filter((entry) => TEMPORARY_REDIRECTS.has(entry.statusCode));
    if (temporary.length === 0) {
      return pass(
        "redirect-type",
        `Permanent redirect (${statusCodes.join(" \u2192 ")}) correctly used`,
        { statusCodes, type: "permanent" }
      );
    }
    return warn(
      "redirect-type",
      `Temporary redirect (${temporary.map((entry) => entry.statusCode).join(", ")}) detected; use 301 or 308 for permanent moves to preserve link equity`,
      {
        statusCodes,
        type: "temporary",
        temporaryHops: temporary.map((entry) => ({ url: entry.url, statusCode: entry.statusCode })),
        recommendation: "Change to 301 (Moved Permanently) or 308 (Permanent Redirect) if the move is permanent"
      }
    );
  }
});
