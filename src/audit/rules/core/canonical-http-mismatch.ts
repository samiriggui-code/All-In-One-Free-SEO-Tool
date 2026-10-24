import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const canonicalHttpMismatchRule = defineRule({
  id: "core-canonical-http-mismatch",
  name: "Canonical Protocol Mismatch",
  description: "Checks if canonical URL protocol mismatches the page protocol (HTTP vs HTTPS)",
  category: "core",
  weight: 7,
  run: async (context) => {
    const { $, url } = context;
    const canonicalHref = $('link[rel="canonical"]').first().attr("href")?.trim();
    if (!canonicalHref) {
      return pass(
        "core-canonical-http-mismatch",
        "No canonical tag present; skipping protocol check",
        { canonicalFound: false }
      );
    }
    let canonicalUrl;
    try {
      canonicalUrl = new URL(canonicalHref, url);
    } catch {
      return pass(
        "core-canonical-http-mismatch",
        "Canonical URL could not be parsed; skipping protocol check",
        { canonicalHref }
      );
    }
    let pageUrl;
    try {
      pageUrl = new URL(url);
    } catch {
      return pass(
        "core-canonical-http-mismatch",
        "Page URL could not be parsed; skipping protocol check",
        { url }
      );
    }
    const pageProtocol = pageUrl.protocol;
    const canonicalProtocol = canonicalUrl.protocol;
    if (pageProtocol === canonicalProtocol) {
      return pass(
        "core-canonical-http-mismatch",
        `Page and canonical use the same protocol (${pageProtocol.replace(":", "")})`,
        {
          pageProtocol,
          canonicalProtocol,
          canonicalUrl: canonicalUrl.href
        }
      );
    }
    const isDowngrade = pageProtocol === "https:" && canonicalProtocol === "http:";
    return fail(
      "core-canonical-http-mismatch",
      `Protocol mismatch: page is ${pageProtocol.replace(":", "").toUpperCase()} but canonical points to ${canonicalProtocol.replace(":", "").toUpperCase()} ("${canonicalUrl.href}")`,
      {
        pageProtocol,
        canonicalProtocol,
        canonicalUrl: canonicalUrl.href,
        pageUrl: url,
        isDowngrade,
        recommendation: isDowngrade ? "Update canonical to use HTTPS to match the page protocol and avoid indexing the insecure version" : "Ensure canonical protocol matches the page protocol"
      }
    );
  }
});
