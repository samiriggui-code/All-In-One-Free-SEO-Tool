import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const trustedTypesRule = defineRule({
  id: "security-trusted-types",
  name: "Trusted Types",
  description: "Checks that the Content-Security-Policy requires Trusted Types for DOM XSS sinks",
  category: "security",
  weight: 2,
  run: (context) => {
    const { headers, url } = context;
    const header = headers["content-security-policy"] ?? headers["content-security-policy-report-only"];
    if (!header) {
      return notMeasured(
        "security-trusted-types",
        "No Content-Security-Policy, so Trusted Types cannot be enforced yet",
        { url }
      );
    }
    const normalized = header.toLowerCase();
    const requiresTrustedTypes = normalized.includes("require-trusted-types-for");
    const details = {
      url,
      requiresTrustedTypes,
      hasTrustedTypesDirective: normalized.includes("trusted-types")
    };
    if (!requiresTrustedTypes) {
      return warn(
        "security-trusted-types",
        "Content-Security-Policy does not set require-trusted-types-for 'script', which would block DOM-based XSS sinks.",
        details
      );
    }
    return pass(
      "security-trusted-types",
      "Content-Security-Policy requires Trusted Types for script sinks",
      details
    );
  }
});
