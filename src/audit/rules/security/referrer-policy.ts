import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const VALID_POLICIES = [
  "no-referrer",
  "no-referrer-when-downgrade",
  "origin",
  "origin-when-cross-origin",
  "same-origin",
  "strict-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url"
];
export const RECOMMENDED_POLICIES = [
  "no-referrer",
  "strict-origin",
  "strict-origin-when-cross-origin",
  "same-origin"
];
export const referrerPolicyRule = defineRule({
  id: "security-referrer-policy",
  name: "Referrer-Policy",
  description: "Checks for Referrer-Policy header",
  category: "security",
  weight: 2,
  run: (context) => {
    const { headers, $, url } = context;
    let policy = headers["referrer-policy"];
    let source = "header";
    if (!policy) {
      const metaReferrer = $('meta[name="referrer"]').attr("content");
      if (metaReferrer) {
        policy = metaReferrer;
        source = "meta";
      }
    }
    if (!policy) {
      return warn(
        "security-referrer-policy",
        "Referrer-Policy is not set. Consider adding to control referrer information.",
        { url }
      );
    }
    const normalizedPolicy = policy.toLowerCase().trim();
    if (!VALID_POLICIES.includes(normalizedPolicy)) {
      return warn(
        "security-referrer-policy",
        `Invalid Referrer-Policy value: "${policy}"`,
        {
          url,
          policy,
          source,
          validPolicies: VALID_POLICIES
        }
      );
    }
    if (normalizedPolicy === "unsafe-url") {
      return warn(
        "security-referrer-policy",
        'Referrer-Policy "unsafe-url" leaks full URL to all origins. Consider a stricter policy.',
        {
          url,
          policy,
          source,
          recommendation: "strict-origin-when-cross-origin"
        }
      );
    }
    const isRecommended = RECOMMENDED_POLICIES.includes(normalizedPolicy);
    return pass(
      "security-referrer-policy",
      `Referrer-Policy is set to "${policy}"${isRecommended ? " (recommended)" : ""}`,
      {
        url,
        policy,
        source,
        isRecommended
      }
    );
  }
});
