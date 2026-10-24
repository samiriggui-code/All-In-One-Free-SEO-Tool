import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { requestSignal } from "@/audit/crawler/fetcher";
import { rethrowIfAborted, throwIfAborted } from "@/audit/engine/errors";
import { auditFetch } from "@/audit/crawler/net";

export function normalizeUrl8(url: string) {
  try {
    const urlObj = new URL(url);
    let path3 = urlObj.pathname;
    if (path3.length > 1 && path3.endsWith("/")) {
      path3 = path3.slice(0, -1);
    }
    return `${urlObj.protocol}//${urlObj.host.toLowerCase()}${path3}${urlObj.search}`;
  } catch {
    return url.toLowerCase().replace(/\/$/, "");
  }
}
export async function checkCanonicalRedirect(canonicalUrl: string, signal?: AbortSignal) {
  throwIfAborted(signal);
  const head = requestSignal(1e4, signal);
  try {
    const response = await auditFetch(canonicalUrl, {
      method: "HEAD",
      redirect: "manual",
      signal: head.signal
    });
    const statusCode = response.status;
    if (statusCode >= 300 && statusCode < 400) {
      const location = response.headers.get("location");
      if (location) {
        const finalUrl = new URL(location, canonicalUrl).href;
        let chainLength = 1;
        let currentUrl = finalUrl;
        for (let i = 0; i < 5; i++) {
          throwIfAborted(signal);
          const hop = requestSignal(5e3, signal);
          try {
            const chainResponse = await auditFetch(currentUrl, {
              method: "HEAD",
              redirect: "manual",
              signal: hop.signal
            });
            if (chainResponse.status >= 300 && chainResponse.status < 400) {
              const nextLocation = chainResponse.headers.get("location");
              if (nextLocation) {
                currentUrl = new URL(nextLocation, currentUrl).href;
                chainLength++;
              } else {
                break;
              }
            } else {
              break;
            }
          } catch (error) {
            rethrowIfAborted(error, signal);
            break;
          } finally {
            hop.dispose();
          }
        }
        return {
          redirects: true,
          statusCode,
          finalUrl: currentUrl,
          chainLength
        };
      }
    }
    return {
      redirects: false,
      statusCode,
      chainLength: 0
    };
  } catch (error) {
    rethrowIfAborted(error, signal);
    const message = error instanceof Error ? error.message : String(error);
    return {
      redirects: false,
      statusCode: 0,
      chainLength: 0,
      error: message
    };
  } finally {
    head.dispose();
  }
}
export const canonicalRedirectRule = defineRule({
  id: "crawl-canonical-redirect",
  name: "Canonical Redirect Chain",
  description: "Checks that canonical URLs do not redirect",
  category: "crawl",
  weight: 15,
  run: async (context) => {
    const { $, url } = context;
    const canonical = $('link[rel="canonical"]').attr("href");
    if (!canonical) {
      return warn(
        "crawl-canonical-redirect",
        "No canonical tag found",
        { hasCanonical: false }
      );
    }
    let absoluteCanonical;
    try {
      absoluteCanonical = new URL(canonical, url).href;
    } catch {
      return fail(
        "crawl-canonical-redirect",
        "Canonical URL is malformed",
        { canonical, error: "Could not parse URL" }
      );
    }
    const normalizedUrl = normalizeUrl8(url);
    const normalizedCanonical = normalizeUrl8(absoluteCanonical);
    const isSelfReferencing = normalizedUrl === normalizedCanonical;
    const redirectInfo = await checkCanonicalRedirect(absoluteCanonical, context.signal);
    const details = {
      canonical: absoluteCanonical,
      currentUrl: url,
      isSelfReferencing,
      redirects: redirectInfo.redirects,
      statusCode: redirectInfo.statusCode,
      finalUrl: redirectInfo.finalUrl,
      chainLength: redirectInfo.chainLength
    };
    if (redirectInfo.error) {
      return warn(
        "crawl-canonical-redirect",
        `Could not verify canonical URL: ${redirectInfo.error}`,
        { ...details, error: redirectInfo.error }
      );
    }
    if (redirectInfo.statusCode >= 400) {
      return fail(
        "crawl-canonical-redirect",
        `Canonical URL returns HTTP ${redirectInfo.statusCode}`,
        {
          ...details,
          impact: "Canonical pointing to an error page",
          recommendation: "Update canonical to point to a valid URL"
        }
      );
    }
    if (redirectInfo.redirects) {
      const severity = redirectInfo.chainLength > 2 ? "fail" : "warn";
      const message = redirectInfo.chainLength > 1 ? `Canonical URL has ${redirectInfo.chainLength}-redirect chain` : "Canonical URL redirects to another URL";
      if (severity === "fail") {
        return fail("crawl-canonical-redirect", message, {
          ...details,
          impact: "Redirect chains waste crawl budget and dilute link equity",
          recommendation: `Update canonical to point directly to ${redirectInfo.finalUrl}`
        });
      }
      return warn("crawl-canonical-redirect", message, {
        ...details,
        recommendation: `Update canonical to point directly to ${redirectInfo.finalUrl}`
      });
    }
    return pass(
      "crawl-canonical-redirect",
      isSelfReferencing ? "Canonical is self-referencing and does not redirect" : "Canonical URL does not redirect",
      details
    );
  }
});
