// Search engines wrap result links in their own click-tracking redirectors.
// Bing serves every organic href as https://www.bing.com/ck/a?...&u=a1<base64url>
// where the decoded value is the real destination. Left un-decoded, every
// downstream consumer sees "bing.com" as the result host — which silently
// breaks rank matching, competitor de-duplication, and self-exclusion.

/** Decode a base64url payload (no padding) to UTF-8. Returns "" on garbage. */
function decodeBase64Url(raw: string): string {
  let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  try {
    const out = Buffer.from(b64, "base64").toString("utf8");
    return /^https?:\/\//i.test(out) ? out : "";
  } catch {
    return "";
  }
}

/**
 * Unwrap a search-engine click-tracking URL to its real destination.
 * Handles Bing (`/ck/a?...u=a1<base64url>`) and DuckDuckGo (`/l/?uddg=<encoded>`).
 * Any URL that is not a known redirector is returned unchanged.
 */
export function unwrapSerpUrl(href: string): string {
  if (!href) return href;

  // DuckDuckGo: /l/?uddg=<percent-encoded absolute url>
  const ddg = /[?&]uddg=([^&]+)/.exec(href);
  if (ddg) {
    try {
      const decoded = decodeURIComponent(ddg[1]);
      if (/^https?:\/\//i.test(decoded)) return decoded;
    } catch {
      /* fall through */
    }
  }

  // Bing: https://www.bing.com/ck/a?...&u=a1<base64url>
  // The "a1" prefix is a Bing-internal version marker, not part of the payload.
  const bing = /[?&]u=a1([^&]+)/.exec(href);
  if (bing) {
    const decoded = decodeBase64Url(bing[1]);
    if (decoded) return decoded;
  }

  // Some engines use a plain percent-encoded ?url= / ?u= parameter.
  const plain = /[?&](?:url|u)=(https?%3A%2F%2F[^&]+)/i.exec(href);
  if (plain) {
    try {
      const decoded = decodeURIComponent(plain[1]);
      if (/^https?:\/\//i.test(decoded)) return decoded;
    } catch {
      /* fall through */
    }
  }

  return href;
}

/** True when a URL still points at a search engine's own domain. */
export function isSearchEngineUrl(u: string): boolean {
  try {
    const host = new URL(u).hostname.replace(/^www\./, "");
    return (
      host === "bing.com" ||
      host.endsWith(".bing.com") ||
      host === "duckduckgo.com" ||
      host.endsWith(".duckduckgo.com") ||
      host === "google.com" ||
      host.endsWith(".google.com")
    );
  } catch {
    return false;
  }
}
