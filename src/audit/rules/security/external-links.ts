import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const externalLinksSecurityRule = defineRule({
  id: "security-external-links",
  name: "External Link Security",
  description: 'Checks external target="_blank" links for noopener and noreferrer',
  category: "security",
  weight: 3,
  run: (context) => {
    const { $, url } = context;
    const pageHost = new URL(url).hostname;
    const insecureLinks: { href: string; text: string; rel: string; missingNoopener: boolean; missingNoreferrer: boolean; }[] = [];
    let totalBlankLinks = 0;
    $('a[target="_blank"]').each((_, el) => {
      const $link = $(el);
      const href = $link.attr("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      totalBlankLinks++;
      try {
        const linkHost = new URL(href, url).hostname;
        if (linkHost === pageHost) return;
      } catch {
        return;
      }
      const rel = ($link.attr("rel") || "").toLowerCase();
      const relParts = rel.split(/\s+/).filter(Boolean);
      const hasNoopener = relParts.includes("noopener");
      const hasNoreferrer = relParts.includes("noreferrer");
      if (!hasNoopener && !hasNoreferrer) {
        insecureLinks.push({
          href,
          text: $link.text().trim().slice(0, 50) || "[no text]",
          rel: rel || "[none]",
          missingNoopener: true,
          missingNoreferrer: true
        });
      }
    });
    if (insecureLinks.length === 0) {
      return pass("security-external-links", 'All external target="_blank" links have noopener/noreferrer', {
        checkedLinks: totalBlankLinks
      });
    }
    return warn(
      "security-external-links",
      `${insecureLinks.length} external link(s) with target="_blank" missing noopener/noreferrer`,
      {
        insecureLinks: insecureLinks.slice(0, 10),
        totalInsecure: insecureLinks.length,
        totalBlankLinks
      }
    );
  }
});
