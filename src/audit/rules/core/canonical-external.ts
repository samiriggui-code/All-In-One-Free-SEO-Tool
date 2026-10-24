import { defineRule, pass } from "@/audit/engine/define-rule";

export const canonicalExternalRule = defineRule({
  id: "core-canonical-external",
  name: "Canonical Points To External URL",
  description: "Reports when the canonical URL points to a different host (legitimate for syndication, worth verifying)",
  category: "core",
  weight: 1,
  run: (context) => {
    const { $, url } = context;
    const href = $('link[rel="canonical"]').first().attr("href")?.trim();
    if (!href) {
      return pass("core-canonical-external", "No canonical tag declared", { found: false });
    }
    let canonical;
    let page;
    try {
      canonical = new URL(href, url);
      page = new URL(url);
    } catch {
      return pass(
        "core-canonical-external",
        "Canonical URL could not be parsed for host comparison",
        { found: true, canonicalUrl: href }
      );
    }
    if (canonical.host !== page.host) {
      return pass(
        "core-canonical-external",
        `Canonical points to an external host: ${canonical.host}`,
        {
          found: true,
          external: true,
          canonicalUrl: canonical.href,
          canonicalHost: canonical.host,
          pageHost: page.host,
          note: "Cross-domain canonicals are legitimate for syndicated or consolidated content - verify the target is intentional, as this page cedes its ranking signals to the other host."
        }
      );
    }
    return pass("core-canonical-external", "Canonical points to a URL on the same host", {
      found: true,
      external: false,
      canonicalUrl: canonical.href
    });
  }
});
