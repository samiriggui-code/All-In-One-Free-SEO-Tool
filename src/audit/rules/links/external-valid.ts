import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { fetchUrl } from "@/audit/crawler/fetcher";
import { rethrowIfAborted } from "@/audit/engine/errors";

export const externalValidRule = defineRule({
  id: "links-external-valid",
  name: "External Links Valid",
  description: "Checks that external links are reachable and return valid responses",
  category: "links",
  weight: 1,
  run: async (context) => {
    const { links } = context;
    const externalLinks = links.filter((link) => !link.isInternal);
    if (externalLinks.length === 0) {
      return pass(
        "links-external-valid",
        "No external links found to check",
        { totalLinks: 0 }
      );
    }
    const unreachableLinks = [];
    const linksToCheck = externalLinks.slice(0, 20);
    for (const link of linksToCheck) {
      try {
        const statusCode = await fetchUrl(link.href, 1e4, context.signal);
        if (statusCode === 0 || statusCode >= 400) {
          unreachableLinks.push({
            href: link.href,
            statusCode
          });
        }
      } catch (error) {
        rethrowIfAborted(error, context.signal);
        unreachableLinks.push({
          href: link.href,
          statusCode: 0
        });
      }
    }
    if (unreachableLinks.length > 0) {
      return warn(
        "links-external-valid",
        `Found ${unreachableLinks.length} unreachable external link(s) out of ${linksToCheck.length} checked`,
        {
          unreachableCount: unreachableLinks.length,
          totalChecked: linksToCheck.length,
          totalExternal: externalLinks.length,
          unreachableLinks: unreachableLinks.slice(0, 10)
          // Limit to first 10
        }
      );
    }
    return pass(
      "links-external-valid",
      `All ${linksToCheck.length} checked external link(s) are reachable`,
      {
        totalChecked: linksToCheck.length,
        totalExternal: externalLinks.length
      }
    );
  }
});
