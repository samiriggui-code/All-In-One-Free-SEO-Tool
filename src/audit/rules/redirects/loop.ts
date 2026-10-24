import { defineRule, fail, notMeasured, pass } from "@/audit/engine/define-rule";

export function normalizeChainUrl(url: string) {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}
export const redirectLoopRule = defineRule({
  id: "redirect-loop",
  name: "No Redirect Loops",
  description: "Checks that the redirect chain does not contain loops",
  category: "redirect",
  weight: 15,
  run: (context) => {
    const redirectChain = context.redirectChain;
    if (!redirectChain || redirectChain.length === 0) {
      return notMeasured("redirect-loop", "Redirect chain was not recorded for this page");
    }
    const seenUrls = /* @__PURE__ */ new Set();
    const duplicates = [];
    for (const entry of redirectChain) {
      const normalizedUrl = normalizeChainUrl(entry.url);
      if (seenUrls.has(normalizedUrl)) {
        duplicates.push(entry.url);
      }
      seenUrls.add(normalizedUrl);
    }
    if (duplicates.length === 0) {
      return pass("redirect-loop", "No redirect loop detected", {
        chainLength: redirectChain.length
      });
    }
    return fail(
      "redirect-loop",
      `Redirect loop detected: ${duplicates.length} URL(s) appear more than once in the chain`,
      {
        chainLength: redirectChain.length,
        duplicateUrls: duplicates,
        chain: redirectChain.map((entry) => ({
          url: entry.url,
          statusCode: entry.statusCode
        }))
      }
    );
  }
});
