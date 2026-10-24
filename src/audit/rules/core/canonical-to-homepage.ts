import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export function resolveCanonical(href: string, pageUrl: string) {
  try {
    return new URL(href, pageUrl);
  } catch {
    return null;
  }
}
export const canonicalToHomepageRule = defineRule({
  id: "core-canonical-to-homepage",
  name: "Canonical Pointing to Homepage",
  description: "Checks if a non-homepage has its canonical URL pointing to the homepage",
  category: "core",
  weight: 6,
  run: async (context) => {
    const { $, url } = context;
    const canonicalHref = $('link[rel="canonical"]').first().attr("href")?.trim();
    if (!canonicalHref) {
      return pass(
        "core-canonical-to-homepage",
        "No canonical tag present; skipping homepage check",
        { canonicalFound: false }
      );
    }
    let pageUrl;
    try {
      pageUrl = new URL(url);
    } catch {
      return pass(
        "core-canonical-to-homepage",
        "Could not parse page URL; skipping check",
        { url }
      );
    }
    const pagePath = pageUrl.pathname.replace(/\/$/, "") || "/";
    if (pagePath === "/" || pagePath === "") {
      return pass(
        "core-canonical-to-homepage",
        "Page is the homepage; canonical to homepage is expected",
        { pageUrl: url, pagePath }
      );
    }
    const canonicalUrl = resolveCanonical(canonicalHref, url);
    if (!canonicalUrl) {
      return pass(
        "core-canonical-to-homepage",
        "Canonical URL could not be resolved; skipping homepage check",
        { canonicalHref }
      );
    }
    const canonicalPath = canonicalUrl.pathname.replace(/\/$/, "") || "/";
    if (canonicalPath === "/" || canonicalPath === "") {
      return fail(
        "core-canonical-to-homepage",
        `Non-homepage page canonicalizes to homepage: canonical is "${canonicalHref}" but page path is "${pageUrl.pathname}"`,
        {
          canonicalUrl: canonicalUrl.href,
          canonicalPath,
          pageUrl: url,
          pagePath: pageUrl.pathname,
          recommendation: "Set the canonical URL to the current page URL (self-referencing canonical) unless this is an intentional redirect"
        }
      );
    }
    return pass(
      "core-canonical-to-homepage",
      "Canonical URL does not point to the homepage",
      {
        canonicalUrl: canonicalUrl.href,
        canonicalPath,
        pagePath: pageUrl.pathname
      }
    );
  }
});
