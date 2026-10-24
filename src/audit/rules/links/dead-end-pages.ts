import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const deadEndPagesRule = defineRule({
  id: "links-dead-end-pages",
  name: "No Dead-End Pages",
  description: "Checks that pages have at least one outgoing internal link for navigation",
  category: "links",
  weight: 1,
  run: (context) => {
    const { links, url } = context;
    const pageUrl = new URL(url);
    const outgoingInternalLinks = links.filter((link) => {
      if (!link.isInternal) return false;
      try {
        const linkUrl = new URL(link.href);
        if (linkUrl.hostname === pageUrl.hostname && linkUrl.pathname === pageUrl.pathname && linkUrl.search === pageUrl.search) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    });
    if (outgoingInternalLinks.length === 0) {
      return warn(
        "links-dead-end-pages",
        "Page is a dead-end with no outgoing internal links",
        {
          internalLinkCount: 0,
          recommendation: "Add navigation links, related content links, or breadcrumbs"
        }
      );
    }
    return pass(
      "links-dead-end-pages",
      `Page has ${outgoingInternalLinks.length} outgoing internal link(s)`,
      { internalLinkCount: outgoingInternalLinks.length }
    );
  }
});
