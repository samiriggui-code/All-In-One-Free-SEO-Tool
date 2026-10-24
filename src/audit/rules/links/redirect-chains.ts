import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { fetchUrlWithRedirects } from "@/audit/crawler/fetcher";
import { internalLinkTargets } from "@/audit/rules/links/link-targets";
import { rethrowIfAborted } from "@/audit/engine/errors";

export const redirectChainsRule = defineRule({
  id: "links-redirect-chains",
  name: "No Redirect Chains",
  description: "Checks that internal links do not go through multiple redirects",
  category: "links",
  weight: 1,
  run: async (context) => {
    const { links } = context;
    const uniqueUrls = internalLinkTargets(links, context.url);
    if (uniqueUrls.length === 0) {
      return pass(
        "links-redirect-chains",
        "No internal links to check",
        { totalChecked: 0 }
      );
    }
    const sampleSize = Math.min(uniqueUrls.length, 20);
    const sampled = uniqueUrls.slice(0, sampleSize);
    const redirectingLinks = [];
    for (const url of sampled) {
      try {
        const result = await fetchUrlWithRedirects(url, 1e4, 5, context.signal);
        if (result.redirectCount > 0) {
          redirectingLinks.push({
            url,
            finalUrl: result.finalUrl,
            redirectCount: result.redirectCount,
            chain: result.chain
          });
        }
      } catch (error) {
        rethrowIfAborted(error, context.signal);
      }
    }
    if (redirectingLinks.length === 0) {
      return pass(
        "links-redirect-chains",
        `All ${sampleSize} sampled internal link(s) resolve directly`,
        {
          totalChecked: sampleSize,
          totalInternalLinks: uniqueUrls.length
        }
      );
    }
    const longChains = redirectingLinks.filter((l) => l.redirectCount >= 3);
    const shortChains = redirectingLinks.filter((l) => l.redirectCount < 3);
    if (longChains.length > 0) {
      return fail(
        "links-redirect-chains",
        `Found ${longChains.length} link(s) with 3+ redirect hops`,
        {
          totalChecked: sampleSize,
          totalInternalLinks: uniqueUrls.length,
          longChainCount: longChains.length,
          shortChainCount: shortChains.length,
          longChains: longChains.slice(0, 5).map((l) => ({
            url: l.url,
            finalUrl: l.finalUrl,
            redirectCount: l.redirectCount,
            chain: l.chain
          })),
          recommendation: "Update links to point directly to final destination URLs"
        }
      );
    }
    return warn(
      "links-redirect-chains",
      `Found ${shortChains.length} link(s) with 1-2 redirect hops`,
      {
        totalChecked: sampleSize,
        totalInternalLinks: uniqueUrls.length,
        redirectingLinkCount: shortChains.length,
        redirectingLinks: shortChains.slice(0, 10).map((l) => ({
          url: l.url,
          finalUrl: l.finalUrl,
          redirectCount: l.redirectCount
        })),
        recommendation: "Update links to point directly to final destination URLs"
      }
    );
  }
});
