import type { CheerioAPI } from "cheerio";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function hasNoindexDirective($: CheerioAPI, headers: Record<string, string>) {
  const robotsContent = $('meta[name="robots"]').attr("content") || "";
  if (/noindex/i.test(robotsContent)) {
    return true;
  }
  const googlebotContent = $('meta[name="googlebot"]').attr("content") || "";
  if (/noindex/i.test(googlebotContent)) {
    return true;
  }
  const xRobotsTag = headers["x-robots-tag"] || headers["X-Robots-Tag"] || "";
  if (/noindex/i.test(xRobotsTag)) {
    return true;
  }
  return false;
}
export function normalizeUrl3(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.replace(/\/$/, "").toLowerCase();
  }
}
export const canonicalToNoindexRule = defineRule({
  id: "core-canonical-to-noindex",
  name: "Canonical and Noindex Conflict",
  description: "Checks if a page has both noindex and a canonical pointing to a different URL (conflicting signals)",
  category: "core",
  weight: 7,
  run: async (context) => {
    const { $, url, headers } = context;
    const canonicalHref = $('link[rel="canonical"]').first().attr("href")?.trim();
    if (!canonicalHref) {
      return pass(
        "core-canonical-to-noindex",
        "No canonical tag present; no noindex conflict possible",
        { canonicalFound: false, hasNoindex: false }
      );
    }
    let canonicalUrl;
    try {
      canonicalUrl = new URL(canonicalHref, url);
    } catch {
      return pass(
        "core-canonical-to-noindex",
        "Canonical URL could not be parsed; skipping noindex conflict check",
        { canonicalHref }
      );
    }
    const normalizedPage = normalizeUrl3(url);
    const normalizedCanonical = normalizeUrl3(canonicalUrl.href);
    const isSelfReferencing = normalizedPage === normalizedCanonical;
    const pageHasNoindex = hasNoindexDirective($, headers);
    if (!pageHasNoindex) {
      return pass(
        "core-canonical-to-noindex",
        "No noindex directive found; no conflict with canonical",
        {
          canonicalUrl: canonicalUrl.href,
          hasNoindex: false,
          selfReferencing: isSelfReferencing
        }
      );
    }
    if (isSelfReferencing) {
      return pass(
        "core-canonical-to-noindex",
        "Page has noindex with self-referencing canonical; no conflicting signals",
        {
          canonicalUrl: canonicalUrl.href,
          hasNoindex: true,
          selfReferencing: true
        }
      );
    }
    return warn(
      "core-canonical-to-noindex",
      `Page has both noindex and a canonical pointing to "${canonicalUrl.href}" (conflicting signals)`,
      {
        canonicalUrl: canonicalUrl.href,
        pageUrl: url,
        hasNoindex: true,
        selfReferencing: false,
        recommendation: "Remove the noindex directive to let the canonical signal work, or remove the canonical and keep noindex if the page should not be indexed"
      }
    );
  }
});
