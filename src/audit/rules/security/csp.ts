import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function parseCspDirectives(value: string) {
  const directives = [];
  const parts = value.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) {
      const directiveName = trimmed.split(/\s+/)[0]?.toLowerCase();
      if (directiveName) {
        directives.push(directiveName);
      }
    }
  }
  return directives;
}
export const FETCH_DIRECTIVES = /* @__PURE__ */ new Set(["script-src", "style-src", "img-src"]);
export const RECOMMENDED_DIRECTIVES = [
  "default-src",
  "script-src",
  "style-src",
  "img-src",
  "frame-ancestors"
];
export const cspRule = defineRule({
  id: "security-csp",
  name: "Content-Security-Policy",
  description: "Checks that Content-Security-Policy header is present",
  category: "security",
  weight: 4,
  run: (context) => {
    const { headers, url } = context;
    const cspHeader = headers["content-security-policy"];
    const cspReportOnlyHeader = headers["content-security-policy-report-only"];
    if (!cspHeader && !cspReportOnlyHeader) {
      return warn(
        "security-csp",
        "Content-Security-Policy header is missing. Consider adding CSP to prevent XSS attacks.",
        { url }
      );
    }
    if (!cspHeader && cspReportOnlyHeader) {
      const directives2 = parseCspDirectives(cspReportOnlyHeader);
      return warn(
        "security-csp",
        "Content-Security-Policy is in report-only mode. Consider enforcing the policy.",
        {
          url,
          mode: "report-only",
          headerValue: cspReportOnlyHeader,
          directives: directives2
        }
      );
    }
    const directives = parseCspDirectives(cspHeader);
    const xfo = (headers["x-frame-options"] ?? "").trim().toLowerCase();
    const framingBlocked = xfo === "deny" || xfo === "sameorigin";
    const missingRecommended = RECOMMENDED_DIRECTIVES.filter((d) => {
      if (directives.includes(d)) return false;
      if (FETCH_DIRECTIVES.has(d) && directives.includes("default-src")) return false;
      if (d === "frame-ancestors" && framingBlocked) return false;
      return true;
    });
    const details = {
      url,
      headerValue: cspHeader,
      directives,
      missingRecommended,
      hasReportOnly: !!cspReportOnlyHeader
    };
    if (missingRecommended.length > 0) {
      return warn(
        "security-csp",
        `Content-Security-Policy is present but missing recommended directives: ${missingRecommended.join(", ")}`,
        details
      );
    }
    return pass(
      "security-csp",
      `Content-Security-Policy is properly configured with ${directives.length} directives`,
      details
    );
  }
});
