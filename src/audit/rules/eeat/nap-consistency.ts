import type { SchemaNodeSummary } from "@/audit/types";
import { NEEDS_ENTITY_CRAWL, NO_SCHEMA_NODES, loadSchemaNodes } from "@/audit/rules/schema/entity-graph";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export function isIdentity3(node: SchemaNodeSummary) {
  return node.types.some(
    (type: string) => type === "Organization" || type.endsWith("Organization") || type.endsWith("Business")
  );
}
export function phoneKey(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}
export function addressKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export function nameKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export const napConsistencyRule = defineRule({
  id: "eeat-nap-consistency",
  name: "NAP Consistency",
  description: "Checks that one organization name keeps a single phone number and address across the crawl",
  category: "eeat",
  weight: 4,
  run: (context) => {
    const nodes = loadSchemaNodes(context);
    if (!nodes) {
      return notMeasured("eeat-nap-consistency", NEEDS_ENTITY_CRAWL);
    }
    if (nodes.length === 0) {
      return notMeasured("eeat-nap-consistency", NO_SCHEMA_NODES);
    }
    const phones = /* @__PURE__ */ new Map();
    const addresses = /* @__PURE__ */ new Map();
    const labels = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      if (!isIdentity3(node) || !node.name) continue;
      const key = nameKey(node.name);
      if (!key) continue;
      labels.set(key, node.name);
      if (node.telephone) {
        const phone = phoneKey(node.telephone);
        if (phone) {
          const set = phones.get(key) ?? /* @__PURE__ */ new Set();
          set.add(phone);
          phones.set(key, set);
        }
      }
      if (node.address) {
        const address = addressKey(node.address);
        if (address) {
          const set = addresses.get(key) ?? /* @__PURE__ */ new Set();
          set.add(address);
          addresses.set(key, set);
        }
      }
    }
    const issues = [];
    for (const [key, values] of phones) {
      if (values.size > 1) issues.push(`${labels.get(key)} has ${values.size} phone numbers`);
    }
    for (const [key, values] of addresses) {
      if (values.size > 1) issues.push(`${labels.get(key)} has ${values.size} addresses`);
    }
    if (issues.length === 0) {
      return pass("eeat-nap-consistency", "Organization names agree on phone and address", { issues: [] });
    }
    return warn("eeat-nap-consistency", issues.slice(0, 4).join("; "), {
      issues,
      recommendation: "Publish one phone number and one postal address for each organization name."
    });
  }
});
