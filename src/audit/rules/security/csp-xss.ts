import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export function parseDirectives(header: string) {
  const directives = /* @__PURE__ */ new Map();
  for (const part of header.split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    const name = tokens.shift()?.toLowerCase();
    if (name) directives.set(name, tokens);
  }
  return directives;
}
export const cspXssRule = defineRule({
  id: "security-csp-xss",
  name: "CSP Strength Against XSS",
  description: "Checks that the Content-Security-Policy actually constrains script execution",
  category: "security",
  weight: 6,
  run: (context) => {
    const { headers, url } = context;
    const header = headers["content-security-policy"] ?? headers["content-security-policy-report-only"];
    if (!header) {
      return notMeasured("security-csp-xss", "No Content-Security-Policy to grade", { url });
    }
    const directives = parseDirectives(header);
    const scriptSrc = directives.get("script-src") ?? directives.get("default-src") ?? [];
    const sources = scriptSrc.map((s: string) => s.toLowerCase());
    const hasNonceOrHash = sources.some(
      (s: string) => s.startsWith("'nonce-") || s.startsWith("'sha256-") || s.startsWith("'sha384-") || s.startsWith("'sha512-")
    );
    const hasStrictDynamic = sources.includes("'strict-dynamic'");
    const critical = [];
    const advisory = [];
    if (sources.includes("'unsafe-inline'") && !hasNonceOrHash && !hasStrictDynamic) {
      critical.push("script-src allows 'unsafe-inline' with no nonce or hash");
    }
    if (sources.includes("*") || sources.some((s: string) => s === "http:" || s === "https:")) {
      critical.push("script-src allows any host");
    }
    if (sources.length === 0) {
      critical.push("no script-src or default-src directive");
    }
    if (sources.includes("'unsafe-eval'")) {
      advisory.push("script-src allows 'unsafe-eval'");
    }
    if (!directives.has("object-src") && !directives.has("default-src")) {
      advisory.push("no object-src directive (plugins can execute; set object-src 'none')");
    }
    if (!directives.has("base-uri")) {
      advisory.push("no base-uri directive (a <base> injection can redirect relative scripts)");
    }
    const details = {
      url,
      reportOnly: !headers["content-security-policy"],
      scriptSrc,
      critical,
      advisory
    };
    if (critical.length > 0) {
      return fail(
        "security-csp-xss",
        `Content-Security-Policy does not effectively restrict scripts: ${critical.join("; ")}`,
        details
      );
    }
    if (advisory.length > 0) {
      return warn(
        "security-csp-xss",
        `Content-Security-Policy restricts scripts but could be tightened: ${advisory.join("; ")}`,
        details
      );
    }
    return pass(
      "security-csp-xss",
      "Content-Security-Policy meaningfully restricts script execution",
      details
    );
  }
});
