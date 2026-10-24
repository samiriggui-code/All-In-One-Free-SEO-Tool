import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export function parseHstsHeader(value: string) {
  const result: { maxAge: number | null; includeSubDomains: boolean; preload: boolean } = {
    maxAge: null,
    includeSubDomains: false,
    preload: false
  };
  const directives = value.split(";").map((d) => d.trim().toLowerCase());
  for (const directive of directives) {
    if (directive.startsWith("max-age=")) {
      const ageValue = directive.substring(8);
      const parsed = parseInt(ageValue, 10);
      if (!isNaN(parsed)) {
        result.maxAge = parsed;
      }
    } else if (directive === "includesubdomains") {
      result.includeSubDomains = true;
    } else if (directive === "preload") {
      result.preload = true;
    }
  }
  return result;
}
export const RECOMMENDED_MAX_AGE = 31536e3;
export const hstsRule = defineRule({
  id: "security-hsts",
  name: "HSTS Header",
  description: "Checks that Strict-Transport-Security header is present with appropriate settings",
  category: "security",
  weight: 6,
  run: (context) => {
    const { headers, url } = context;
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== "https:") {
        return warn(
          "security-hsts",
          "HSTS only applies to HTTPS URLs; site is currently served over HTTP",
          { url, protocol: urlObj.protocol }
        );
      }
    } catch {
    }
    const hstsHeader = headers["strict-transport-security"];
    if (!hstsHeader) {
      return fail(
        "security-hsts",
        "Strict-Transport-Security header is missing",
        { url }
      );
    }
    const parsed = parseHstsHeader(hstsHeader);
    const details = {
      url,
      headerValue: hstsHeader,
      ...parsed,
      recommendedMaxAge: RECOMMENDED_MAX_AGE
    };
    if (parsed.maxAge === null) {
      return fail(
        "security-hsts",
        "HSTS header is present but max-age directive is missing or invalid",
        details
      );
    }
    if (parsed.maxAge < RECOMMENDED_MAX_AGE) {
      return warn(
        "security-hsts",
        `HSTS max-age is ${parsed.maxAge} seconds (recommended: ${RECOMMENDED_MAX_AGE} seconds / 1 year)`,
        details
      );
    }
    const features = ["max-age=" + parsed.maxAge];
    if (parsed.includeSubDomains) features.push("includeSubDomains");
    if (parsed.preload) features.push("preload");
    return pass(
      "security-hsts",
      `HSTS is properly configured: ${features.join("; ")}`,
      details
    );
  }
});
