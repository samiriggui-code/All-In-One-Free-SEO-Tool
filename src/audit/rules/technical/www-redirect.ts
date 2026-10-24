import type { AuditContext } from "@/audit/types";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { fetchUrl } from "@/audit/crawler/fetcher";
import { rethrowIfAborted } from "@/audit/engine/errors";

export function getWwwVariants(url: string) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    let wwwHostname;
    let nonWwwHostname;
    if (hostname.startsWith("www.")) {
      wwwHostname = hostname;
      nonWwwHostname = hostname.substring(4);
    } else {
      wwwHostname = `www.${hostname}`;
      nonWwwHostname = hostname;
    }
    const wwwUrl = new URL(url);
    wwwUrl.hostname = wwwHostname;
    const nonWwwUrl = new URL(url);
    nonWwwUrl.hostname = nonWwwHostname;
    return {
      wwwUrl: wwwUrl.href,
      nonWwwUrl: nonWwwUrl.href
    };
  } catch {
    return null;
  }
}
export function getCanonicalHostname(context: AuditContext) {
  const { $ } = context;
  const canonicalLink = $('link[rel="canonical"]').attr("href");
  if (canonicalLink) {
    try {
      const canonicalUrl = new URL(canonicalLink);
      return canonicalUrl.hostname;
    } catch {
      return null;
    }
  }
  return null;
}
export const wwwRedirectRule = defineRule({
  id: "technical-www-redirect",
  name: "WWW Redirect",
  description: "Checks that www and non-www versions redirect to one canonical version",
  category: "technical",
  weight: 1,
  run: async (context) => {
    const { url } = context;
    const variants = getWwwVariants(url);
    if (!variants) {
      return warn(
        "technical-www-redirect",
        "Could not determine www/non-www variants for this URL",
        { url }
      );
    }
    const { wwwUrl, nonWwwUrl } = variants;
    const currentHostname = new URL(url).hostname;
    const isWww = currentHostname.startsWith("www.");
    const canonicalHostname = getCanonicalHostname(context);
    const results = {
      wwwStatus: 0,
      nonWwwStatus: 0
    };
    try {
      results.wwwStatus = await fetchUrl(wwwUrl, 1e4, context.signal);
    } catch (error) {
      rethrowIfAborted(error, context.signal);
      results.wwwStatus = 0;
    }
    try {
      results.nonWwwStatus = await fetchUrl(nonWwwUrl, 1e4, context.signal);
    } catch (error) {
      rethrowIfAborted(error, context.signal);
      results.nonWwwStatus = 0;
    }
    const details = {
      url,
      wwwUrl,
      nonWwwUrl,
      currentIsWww: isWww,
      wwwStatus: results.wwwStatus,
      nonWwwStatus: results.nonWwwStatus,
      canonicalHostname
    };
    if (results.wwwStatus === 0 || results.nonWwwStatus === 0) {
      const silentHost = new URL(results.wwwStatus === 0 ? wwwUrl : nonWwwUrl).hostname;
      const accessibleVersion = results.wwwStatus !== 0 ? "www" : "non-www";
      return pass(
        "technical-www-redirect",
        `${silentHost} does not respond, so only the ${accessibleVersion} version serves the site`,
        details
      );
    }
    if (canonicalHostname) {
      const canonicalIsWww = canonicalHostname.startsWith("www.");
      const canonicalMatchesCurrent = canonicalIsWww && isWww || !canonicalIsWww && !isWww;
      if (canonicalMatchesCurrent) {
        return pass(
          "technical-www-redirect",
          `Canonical URL is set to ${canonicalIsWww ? "www" : "non-www"} version`,
          { ...details, canonicalMatchesCurrent }
        );
      } else {
        return warn(
          "technical-www-redirect",
          `Current page is ${isWww ? "www" : "non-www"} but canonical points to ${canonicalIsWww ? "www" : "non-www"}`,
          { ...details, canonicalMatchesCurrent }
        );
      }
    }
    if (results.wwwStatus === 200 && results.nonWwwStatus === 200) {
      return fail(
        "technical-www-redirect",
        "Both www and non-www versions are accessible (should redirect to one canonical version)",
        details
      );
    }
    return warn(
      "technical-www-redirect",
      `WWW version returned ${results.wwwStatus}, non-www returned ${results.nonWwwStatus}`,
      details
    );
  }
});
