import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const caseNormalizationRule = defineRule({
  id: "redirect-case-normalization",
  name: "URL Case Normalization",
  description: "Checks that URLs are properly normalized by case to avoid duplicate content",
  category: "redirect",
  weight: 8,
  run: (context) => {
    const { $, redirectChain } = context;
    const url = redirectChain?.at(-1)?.url ?? context.url;
    const canonicalElement = $('link[rel="canonical"]');
    if (canonicalElement.length === 0) {
      return pass("redirect-case-normalization", "No canonical URL to compare");
    }
    const canonicalHref = canonicalElement.first().attr("href")?.trim();
    if (!canonicalHref) {
      return pass("redirect-case-normalization", "Canonical tag has no href value");
    }
    let normalizedUrl;
    let normalizedCanonical;
    try {
      normalizedUrl = new URL(url).href;
      normalizedCanonical = new URL(canonicalHref, url).href;
    } catch {
      return pass("redirect-case-normalization", "Could not parse URLs for comparison");
    }
    if (normalizedUrl === normalizedCanonical) {
      return pass("redirect-case-normalization", "Current URL matches canonical URL", {
        url: normalizedUrl,
        canonical: normalizedCanonical
      });
    }
    if (normalizedUrl.toLowerCase() === normalizedCanonical.toLowerCase()) {
      return warn(
        "redirect-case-normalization",
        "Canonical URL differs from current URL only by letter casing; add a case-normalization redirect",
        {
          url: normalizedUrl,
          canonical: normalizedCanonical,
          recommendation: "Configure the server to redirect non-canonical URL casings to the canonical form"
        }
      );
    }
    return pass("redirect-case-normalization", "URL and canonical differ by more than case (handled by other rules)", {
      url: normalizedUrl,
      canonical: normalizedCanonical
    });
  }
});
