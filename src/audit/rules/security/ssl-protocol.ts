import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const sslProtocolRule = defineRule({
  id: "security-ssl-protocol",
  name: "TLS Protocol Configuration",
  description: "Checks TLS configuration quality through HSTS directives and security header indicators",
  category: "security",
  weight: 6,
  run: (context) => {
    const { headers, url } = context;
    if (!url.startsWith("https://")) {
      return fail(
        "security-ssl-protocol",
        "Page is served over HTTP; TLS configuration check not applicable",
        {
          isHttps: false,
          recommendation: "Migrate to HTTPS to enable TLS protection"
        }
      );
    }
    const hstsHeader = headers["strict-transport-security"] || "";
    const cspHeader = headers["content-security-policy"] || "";
    if (!hstsHeader) {
      return fail(
        "security-ssl-protocol",
        "No Strict-Transport-Security header on HTTPS site; browsers cannot enforce secure connections",
        {
          isHttps: true,
          hasHsts: false,
          recommendation: "Add Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"
        }
      );
    }
    const hstsLower = hstsHeader.toLowerCase();
    const hasIncludeSubDomains = hstsLower.includes("includesubdomains");
    const hasPreload = hstsLower.includes("preload");
    const hasUpgradeInsecureRequests = cspHeader.toLowerCase().includes("upgrade-insecure-requests");
    const details = {
      isHttps: true,
      hasHsts: true,
      hstsHeader,
      hasIncludeSubDomains,
      hasPreload,
      hasUpgradeInsecureRequests
    };
    if (hasIncludeSubDomains && hasPreload) {
      return pass(
        "security-ssl-protocol",
        "TLS configuration is robust: HSTS with includeSubDomains and preload enabled",
        details
      );
    }
    const missing = [];
    if (!hasIncludeSubDomains) {
      missing.push("includeSubDomains");
    }
    if (!hasPreload) {
      missing.push("preload");
    }
    return warn(
      "security-ssl-protocol",
      `HSTS is present but missing ${missing.join(" and ")}; full protection requires both directives`,
      {
        ...details,
        missingDirectives: missing,
        recommendation: `Add ${missing.join(" and ")} to the Strict-Transport-Security header for complete TLS enforcement`
      }
    );
  }
});
