import type { CookieInfo } from "@/audit/types";

export function parseSameSite(value: string): CookieInfo["sameSite"] {
  switch (value.trim().toLowerCase()) {
    case "strict":
      return "Strict";
    case "lax":
      return "Lax";
    case "none":
      return "None";
    default:
      return undefined;
  }
}

/** Parse one Set-Cookie header. The value itself is never kept, only its length. */
export function parseSetCookie(header: string): CookieInfo | null {
  const segments = header.split(";");
  const pair = segments[0] ?? "";
  const eq = pair.indexOf("=");
  if (eq < 1) return null;
  const name = pair.slice(0, eq).trim();
  if (!name) return null;
  const cookie: CookieInfo = {
    name,
    valueLength: pair.slice(eq + 1).trim().length,
    secure: false,
    httpOnly: false,
  };
  for (const segment of segments.slice(1)) {
    const trimmed = segment.trim();
    const attrEq = trimmed.indexOf("=");
    const attrName = (attrEq === -1 ? trimmed : trimmed.slice(0, attrEq)).toLowerCase();
    const attrValue = attrEq === -1 ? "" : trimmed.slice(attrEq + 1).trim();
    switch (attrName) {
      case "secure":
        cookie.secure = true;
        break;
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "samesite":
        cookie.sameSite = parseSameSite(attrValue);
        break;
      case "domain":
        cookie.domain = attrValue;
        break;
      case "path":
        cookie.path = attrValue;
        break;
      case "expires":
        cookie.expires = attrValue;
        break;
      case "max-age": {
        const maxAge = Number.parseInt(attrValue, 10);
        if (!Number.isNaN(maxAge)) cookie.maxAge = maxAge;
        break;
      }
    }
  }
  return cookie;
}

export function parseSetCookieHeaders(headers: Headers): CookieInfo[] {
  const raw = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  const cookies: CookieInfo[] = [];
  for (const header of raw) {
    const cookie = parseSetCookie(header);
    if (cookie) cookies.push(cookie);
  }
  return cookies;
}

export function cookieLifetimeDays(cookie: CookieInfo, now = Date.now()): number | null {
  if (cookie.maxAge !== undefined) {
    return cookie.maxAge / 86400;
  }
  if (cookie.expires) {
    const expiry = Date.parse(cookie.expires);
    if (Number.isNaN(expiry)) return null;
    return (expiry - now) / 864e5;
  }
  return null;
}
