import { cookieLifetimeDays } from "@/audit/crawler/cookies";
import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const SESSION_COOKIE_PATTERNS = [
  /sess/i,
  /^sid$/i,
  /auth/i,
  /token/i,
  /login/i,
  /csrf/i,
  /xsrf/i,
  /jwt/i,
  /^phpsessid$/i,
  /^asp\.net_sessionid$/i,
  /^jsessionid$/i,
  /remember/i
];
export function isSessionCookie(cookie: { name: string; }) {
  return SESSION_COOKIE_PATTERNS.some((pattern) => pattern.test(cookie.name));
}
export const MAX_USEFUL_LIFETIME_DAYS = 400;
export function isHttps(url: string) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
export const cookieFlagsRule = defineRule({
  id: "security-cookie-flags",
  name: "Cookie Security Flags",
  description: "Checks Set-Cookie headers for Secure, HttpOnly and SameSite attributes on session cookies",
  category: "security",
  weight: 10,
  run: (context) => {
    const cookies = context.cookies;
    if (cookies === void 0) {
      return notMeasured(
        "security-cookie-flags",
        "Response cookies not available - Set-Cookie headers are only captured on a live fetch"
      );
    }
    if (cookies.length === 0) {
      return pass("security-cookie-flags", "No cookies set by the server on this response", {
        cookieCount: 0
      });
    }
    const secureSite = isHttps(context.url);
    const sessionCookies = cookies.filter(isSessionCookie);
    const missingSecure = secureSite ? cookies.filter((c) => !c.secure) : [];
    const missingHttpOnly = sessionCookies.filter((c) => !c.httpOnly);
    const missingSameSite = cookies.filter((c) => c.sameSite === void 0);
    const invalidSameSiteNone = cookies.filter((c) => c.sameSite === "None" && !c.secure);
    const details = {
      cookieCount: cookies.length,
      sessionCookieCount: sessionCookies.length,
      cookieNames: cookies.map((c) => c.name),
      missingSecure: missingSecure.map((c) => c.name),
      missingHttpOnly: missingHttpOnly.map((c) => c.name),
      missingSameSite: missingSameSite.map((c) => c.name),
      invalidSameSiteNone: invalidSameSiteNone.map((c) => c.name)
    };
    if (missingHttpOnly.length > 0) {
      return fail(
        "security-cookie-flags",
        `${missingHttpOnly.length} session cookie(s) missing HttpOnly: ${missingHttpOnly.map((c) => c.name).join(", ")}`,
        {
          ...details,
          impact: "A session cookie without HttpOnly can be read by any JavaScript on the page, so a single XSS becomes account takeover."
        }
      );
    }
    if (invalidSameSiteNone.length > 0) {
      return fail(
        "security-cookie-flags",
        `${invalidSameSiteNone.length} cookie(s) use SameSite=None without Secure and will be rejected by browsers: ${invalidSameSiteNone.map((c) => c.name).join(", ")}`,
        details
      );
    }
    if (missingSecure.length > 0) {
      return warn(
        "security-cookie-flags",
        `${missingSecure.length} cookie(s) on an HTTPS page missing the Secure attribute: ${missingSecure.map((c) => c.name).join(", ")}`,
        details
      );
    }
    if (missingSameSite.length > 0) {
      return warn(
        "security-cookie-flags",
        `${missingSameSite.length} cookie(s) have no SameSite attribute: ${missingSameSite.map((c) => c.name).join(", ")}`,
        {
          ...details,
          note: "Browsers default these to Lax, but setting it explicitly documents the intent and avoids relying on a default that has changed before."
        }
      );
    }
    return pass(
      "security-cookie-flags",
      `All ${cookies.length} cookie(s) set appropriate security flags`,
      details
    );
  }
});
export const cookieLifetimeRule = defineRule({
  id: "security-cookie-lifetime",
  name: "Cookie Lifetime",
  description: "Flags cookies with excessive expiry beyond the 400-day browser cap",
  category: "security",
  weight: 4,
  run: (context) => {
    const cookies = context.cookies;
    if (cookies === void 0) {
      return notMeasured(
        "security-cookie-lifetime",
        "Response cookies not available - Set-Cookie headers are only captured on a live fetch"
      );
    }
    if (cookies.length === 0) {
      return pass("security-cookie-lifetime", "No cookies set by the server on this response", {
        cookieCount: 0
      });
    }
    const excessive = [];
    let sessionCookies = 0;
    for (const cookie of cookies) {
      const days = cookieLifetimeDays(cookie);
      if (days === null) {
        sessionCookies++;
        continue;
      }
      if (days > MAX_USEFUL_LIFETIME_DAYS) {
        excessive.push({ name: cookie.name, days: Math.round(days) });
      }
    }
    const details = {
      cookieCount: cookies.length,
      sessionCookieCount: sessionCookies,
      excessiveLifetime: excessive,
      capDays: MAX_USEFUL_LIFETIME_DAYS
    };
    if (excessive.length > 0) {
      const worst = excessive.reduce((a, b) => a.days > b.days ? a : b);
      return warn(
        "security-cookie-lifetime",
        `${excessive.length} cookie(s) set a lifetime beyond the 400-day browser cap (longest: ${worst.name} at ${worst.days} days)`,
        {
          ...details,
          note: "Chrome trims stored lifetimes to 400 days, so the excess has no effect while still signalling long-term tracking intent to auditors."
        }
      );
    }
    return pass(
      "security-cookie-lifetime",
      `All ${cookies.length} cookie(s) use a reasonable lifetime`,
      details
    );
  }
});
