import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const ONE_DAY = 86400;
export const ONE_YEAR = 31536e3;
export function parseHstsMaxAge(hstsHeader: string) {
  const match = hstsHeader.match(/max-age=(\d+)/i);
  if (match) {
    const parsed = parseInt(match[1], 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
export const sslExpiryRule = defineRule({
  id: "security-ssl-expiry",
  name: "SSL Certificate Health",
  description: "Checks SSL health indicators via HSTS max-age as a proxy for certificate maintenance",
  category: "security",
  weight: 8,
  run: (context) => {
    const { headers, url } = context;
    if (!url.startsWith("https://")) {
      return fail(
        "security-ssl-expiry",
        "Page is served over HTTP; no SSL certificate in use",
        {
          isHttps: false,
          recommendation: "Install an SSL certificate and serve the site over HTTPS"
        }
      );
    }
    const hstsHeader = headers["strict-transport-security"] || "";
    if (!hstsHeader) {
      return warn(
        "security-ssl-expiry",
        "HTTPS is enabled but no Strict-Transport-Security header found; browsers can be downgraded to HTTP",
        {
          isHttps: true,
          hasHsts: false,
          recommendation: "Add Strict-Transport-Security header with max-age of at least 1 year (31536000 seconds)"
        }
      );
    }
    const maxAge = parseHstsMaxAge(hstsHeader);
    if (maxAge === null) {
      return warn(
        "security-ssl-expiry",
        "HSTS header present but max-age is missing or invalid",
        {
          isHttps: true,
          hasHsts: true,
          hstsHeader,
          recommendation: "Set a valid max-age directive in the Strict-Transport-Security header"
        }
      );
    }
    if (maxAge < ONE_DAY) {
      return warn(
        "security-ssl-expiry",
        `HSTS max-age is very short (${maxAge} seconds / ${(maxAge / 3600).toFixed(1)} hours); this provides minimal protection`,
        {
          isHttps: true,
          hasHsts: true,
          maxAge,
          maxAgeHours: Math.round(maxAge / 3600),
          recommendation: "Increase HSTS max-age to at least 1 year (31536000 seconds) for proper browser enforcement"
        }
      );
    }
    if (maxAge >= ONE_YEAR) {
      return pass(
        "security-ssl-expiry",
        `SSL health indicators are good: HSTS max-age is ${(maxAge / 86400).toFixed(0)} days`,
        {
          isHttps: true,
          hasHsts: true,
          maxAge,
          maxAgeDays: Math.round(maxAge / 86400)
        }
      );
    }
    return warn(
      "security-ssl-expiry",
      `HSTS max-age is ${(maxAge / 86400).toFixed(0)} days; recommended minimum is 1 year (365 days)`,
      {
        isHttps: true,
        hasHsts: true,
        maxAge,
        maxAgeDays: Math.round(maxAge / 86400),
        recommendation: "Increase HSTS max-age to at least 31536000 seconds (1 year)"
      }
    );
  }
});
