import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const httpsDowngradeRule = defineRule({
  id: "links-https-downgrade",
  name: "No HTTPS Downgrade Links",
  description: "Checks that HTTPS pages do not link to HTTP URLs",
  category: "links",
  weight: 1,
  run: (context) => {
    const { url, links } = context;
    if (!url.startsWith("https://")) {
      return pass(
        "links-https-downgrade",
        "Page is not served over HTTPS, check not applicable",
        { pageProtocol: "http" }
      );
    }
    const httpLinks = links.filter((link) => {
      try {
        const linkUrl = new URL(link.href);
        return linkUrl.protocol === "http:";
      } catch {
        return false;
      }
    });
    if (httpLinks.length > 0) {
      const httpDomains = [...new Set(
        httpLinks.map((link) => {
          try {
            return new URL(link.href).hostname;
          } catch {
            return "unknown";
          }
        })
      )];
      return warn(
        "links-https-downgrade",
        `Found ${httpLinks.length} link(s) from HTTPS page to HTTP URLs`,
        {
          httpLinkCount: httpLinks.length,
          httpDomains: httpDomains.slice(0, 10),
          httpLinks: httpLinks.slice(0, 10).map((l) => ({
            href: l.href,
            text: l.text
          }))
        }
      );
    }
    return pass(
      "links-https-downgrade",
      "All links maintain HTTPS security",
      { totalLinksChecked: links.length }
    );
  }
});
