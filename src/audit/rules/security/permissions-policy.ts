import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function parsePermissionsPolicy(value: string) {
  const features = [];
  const matches = value.matchAll(/([a-z-]+)\s*=/gi);
  for (const match of matches) {
    features.push(match[1].toLowerCase());
  }
  return features;
}
export const permissionsPolicyRule = defineRule({
  id: "security-permissions-policy",
  name: "Permissions-Policy",
  description: "Checks for Permissions-Policy header",
  category: "security",
  weight: 2,
  run: (context) => {
    const { headers, url } = context;
    const permissionsPolicy = headers["permissions-policy"];
    const featurePolicy = headers["feature-policy"];
    if (!permissionsPolicy && !featurePolicy) {
      return warn(
        "security-permissions-policy",
        "Permissions-Policy header is missing. Consider adding to control browser features.",
        { url }
      );
    }
    if (featurePolicy && !permissionsPolicy) {
      const features2 = parsePermissionsPolicy(featurePolicy);
      return warn(
        "security-permissions-policy",
        "Using deprecated Feature-Policy header. Migrate to Permissions-Policy.",
        {
          url,
          headerName: "Feature-Policy",
          headerValue: featurePolicy,
          features: features2
        }
      );
    }
    const features = parsePermissionsPolicy(permissionsPolicy || "");
    return pass(
      "security-permissions-policy",
      `Permissions-Policy header is set with ${features.length} feature(s)`,
      {
        url,
        headerValue: permissionsPolicy,
        features
      }
    );
  }
});
