import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const internalPresentRule = defineRule({
  id: "links-internal-present",
  name: "Internal Links Present",
  description: "Checks that the page contains internal links for navigation and crawlability",
  category: "links",
  weight: 1,
  run: async (context) => {
    const { links, url } = context;
    const internalLinks = links.filter((link) => link.isInternal);
    const uniqueInternalLinks = internalLinks.filter((link) => {
      try {
        const linkUrl = new URL(link.href);
        const currentUrl = new URL(url);
        linkUrl.hash = "";
        currentUrl.hash = "";
        return linkUrl.href !== currentUrl.href;
      } catch {
        return true;
      }
    });
    if (uniqueInternalLinks.length === 0) {
      return warn(
        "links-internal-present",
        "No internal links found on this page",
        {
          internalLinkCount: 0,
          selfLinks: internalLinks.length,
          suggestion: "Add internal links to improve site navigation and help search engines crawl your site"
        }
      );
    }
    return pass(
      "links-internal-present",
      `Found ${uniqueInternalLinks.length} internal link(s) on this page`,
      {
        internalLinkCount: uniqueInternalLinks.length,
        examples: uniqueInternalLinks.slice(0, 5).map((link) => link.href)
      }
    );
  }
});
