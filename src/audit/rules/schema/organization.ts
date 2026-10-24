import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { findItemsByType, getMissingFields, hasField } from "@/audit/rules/schema/utils";

export const ORG_TYPES = ["Organization", "Corporation", "NGO", "GovernmentOrganization"];
export const REQUIRED3 = ["name"];
export const RECOMMENDED3 = ["url", "logo", "sameAs", "contactPoint", "address"];
export const structuredDataOrganizationRule = defineRule({
  id: "schema-organization",
  name: "Organization Schema",
  description: "Validates Organization schema for brand knowledge panel eligibility",
  category: "schema",
  weight: 8,
  run: (context) => {
    const { $ } = context;
    const orgs = findItemsByType($, ORG_TYPES);
    if (orgs.length === 0) {
      return pass("schema-organization", "No Organization schema found (not required)", {
        found: false
      });
    }
    const warnings = [];
    for (const org of orgs) {
      const missing = getMissingFields(org, REQUIRED3);
      if (missing.length > 0) {
        return warn("schema-organization", `Organization missing: ${missing.join(", ")}`, {
          orgCount: orgs.length,
          missing
        });
      }
      if (hasField(org, "logo")) {
        const logo = org.data.logo;
        if (typeof logo === "string" && !logo.startsWith("http")) {
          warnings.push("logo should be absolute URL");
        }
      } else {
        warnings.push("consider adding logo for brand visibility");
      }
      if (!hasField(org, "sameAs")) {
        warnings.push("consider adding sameAs with social media profiles");
      }
      const missingRecommended = getMissingFields(org, RECOMMENDED3);
      if (missingRecommended.length > 0) {
        warnings.push(`consider adding ${missingRecommended.join(", ")}`);
      }
    }
    if (warnings.length > 0) {
      return warn("schema-organization", "Organization schema valid with suggestions", {
        orgCount: orgs.length,
        warnings
      });
    }
    return pass("schema-organization", `${orgs.length} Organization schema(s) properly configured`, {
      orgCount: orgs.length
    });
  }
});
