import type { JsonLdObject } from "@/audit/rules/schema/utils";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { extractJsonLdScripts, extractTypedItems2 } from "@/audit/rules/schema/utils";

export const IDENTITY = /* @__PURE__ */ new Set([
  "Organization",
  "Corporation",
  "NGO",
  "GovernmentOrganization",
  "NewsMediaOrganization",
  "OnlineStore",
  "LocalBusiness",
  "WebSite",
  "Person"
]);
export function isIdentity(type: string) {
  return IDENTITY.has(type) || type.endsWith("Organization") || type.endsWith("Business");
}
export function idValue(data: JsonLdObject) {
  const id = data["@id"];
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
}
export const entityIdRule = defineRule({
  id: "schema-entity-id",
  name: "Schema Entity @id",
  description: "Checks that Organization, WebSite, Person, and Business entities have an absolute @id",
  category: "schema",
  weight: 8,
  run: (context) => {
    const missing = [];
    const relative = [];
    const seen = /* @__PURE__ */ new Set();
    for (const script of extractJsonLdScripts(context.$)) {
      for (const item of extractTypedItems2(script)) {
        const id = idValue(item.data);
        if (id !== null) {
          const key = `${item.type}|${id}`;
          if (seen.has(key)) continue;
          seen.add(key);
        }
        if (id === null) {
          if (isIdentity(item.type)) missing.push(item.type);
          continue;
        }
        if (!/^https?:\/\//i.test(id)) relative.push(`${item.type} @id ${id}`);
      }
    }
    if (missing.length === 0 && relative.length === 0) {
      return pass("schema-entity-id", "Schema entity identifiers are absolute, or no identity schema is present", {
        missing: [],
        relative: []
      });
    }
    const parts = [];
    if (missing.length > 0) parts.push(`${missing.join(", ")} missing @id`);
    if (relative.length > 0) parts.push(`relative @id: ${relative.slice(0, 5).join("; ")}`);
    return warn("schema-entity-id", parts.join(". "), {
      missing,
      relative,
      recommendation: "Give each Organization, WebSite, and Person one absolute @id, such as https://example.com/#organization, and reuse that URL on every page."
    });
  }
});
