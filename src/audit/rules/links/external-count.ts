import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const externalCountRule = defineRule({
  id: "links-external-count",
  name: "External Links Count",
  description: "Checks that pages do not have an excessive number of external links",
  category: "links",
  weight: 1,
  run: (context) => {
    const { links } = context;
    const externalLinks = links.filter((link) => !link.isInternal);
    const externalCount = externalLinks.length;
    const externalDomains = [...new Set(
      externalLinks.map((link) => {
        try {
          return new URL(link.href).hostname;
        } catch {
          return "unknown";
        }
      })
    )];
    const threshold = 100;
    if (externalCount > threshold) {
      return warn(
        "links-external-count",
        `Page has ${externalCount} external links (exceeds ${threshold} threshold)`,
        {
          externalLinkCount: externalCount,
          uniqueDomains: externalDomains.length,
          topDomains: externalDomains.slice(0, 10),
          threshold,
          recommendation: "Reduce external links to essential, high-quality resources only"
        }
      );
    }
    return pass(
      "links-external-count",
      `Page has ${externalCount} external link(s) across ${externalDomains.length} domain(s)`,
      {
        externalLinkCount: externalCount,
        uniqueDomains: externalDomains.length,
        topDomains: externalDomains.slice(0, 10)
      }
    );
  }
});
