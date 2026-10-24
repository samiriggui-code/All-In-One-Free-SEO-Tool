import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function normalizeUrl2(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.replace(/\/$/, "").toLowerCase();
  }
}
export const canonicalLoopRule = defineRule({
  id: "core-canonical-loop",
  name: "Canonical Loop Detection",
  description: "Checks if canonical URL may create a loop (non-self-referencing canonical)",
  category: "core",
  weight: 7,
  run: async (context) => {
    const { $, url } = context;
    const canonicalHref = $('link[rel="canonical"]').first().attr("href")?.trim();
    if (!canonicalHref) {
      return pass(
        "core-canonical-loop",
        "No canonical tag present; no loop risk",
        { canonicalFound: false }
      );
    }
    let canonicalUrl;
    try {
      canonicalUrl = new URL(canonicalHref, url);
    } catch {
      return pass(
        "core-canonical-loop",
        "Canonical URL could not be parsed; skipping loop check",
        { canonicalHref }
      );
    }
    const normalizedPage = normalizeUrl2(url);
    const normalizedCanonical = normalizeUrl2(canonicalUrl.href);
    if (normalizedPage === normalizedCanonical) {
      return pass(
        "core-canonical-loop",
        "Canonical is self-referencing (best practice)",
        {
          pageUrl: url,
          canonicalUrl: canonicalUrl.href,
          selfReferencing: true
        }
      );
    }
    return warn(
      "core-canonical-loop",
      `Canonical points to a different URL ("${canonicalUrl.href}"); verify the target does not canonicalize back to this page`,
      {
        pageUrl: url,
        canonicalUrl: canonicalUrl.href,
        selfReferencing: false,
        recommendation: "Ensure the canonical target page does not point back to this page, which would create a loop that confuses search engines"
      }
    );
  }
});
