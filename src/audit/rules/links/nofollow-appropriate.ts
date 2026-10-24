import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const UGC_PATTERNS = [
  "/comment",
  "/comments",
  "/forum",
  "/forums",
  "/discussion",
  "/user",
  "/users",
  "/profile",
  "/profiles",
  "/review",
  "/reviews"
];
export const nofollowAppropriateRule = defineRule({
  id: "links-nofollow-appropriate",
  name: "Nofollow Used Appropriately",
  description: "Checks that nofollow is used appropriately on external links and user-generated content",
  category: "links",
  weight: 1,
  run: async (context) => {
    const { links } = context;
    const issues = [];
    for (const link of links) {
      if (!link.isInternal && !link.isNoFollow) {
        const text = link.text.toLowerCase();
        if (text.includes("sponsor") || text.includes("advertis") || text.includes("partner") || text.includes("paid")) {
          issues.push({
            href: link.href,
            text: link.text,
            issue: "Potentially sponsored external link without nofollow"
          });
        }
      }
      if (link.isInternal && link.isNoFollow) {
        const isLikelyUgc = UGC_PATTERNS.some(
          (pattern) => link.href.toLowerCase().includes(pattern)
        );
        if (!isLikelyUgc) {
          issues.push({
            href: link.href,
            text: link.text,
            issue: "Internal link with nofollow (may block PageRank flow)"
          });
        }
      }
    }
    if (issues.length > 0) {
      return warn(
        "links-nofollow-appropriate",
        `Found ${issues.length} link(s) with potentially inappropriate nofollow usage`,
        {
          issueCount: issues.length,
          issues: issues.slice(0, 10),
          // Limit to first 10
          suggestion: "Review nofollow usage: use for sponsored/UGC external links, avoid on internal navigation links"
        }
      );
    }
    return pass(
      "links-nofollow-appropriate",
      "Nofollow attributes appear to be used appropriately",
      {
        totalLinks: links.length,
        externalNofollow: links.filter((l) => !l.isInternal && l.isNoFollow).length,
        internalNofollow: links.filter((l) => l.isInternal && l.isNoFollow).length
      }
    );
  }
});
