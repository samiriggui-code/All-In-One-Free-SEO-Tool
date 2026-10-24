import { NEEDS_ENTITY_CRAWL, NO_SCHEMA_NODES, isAbsoluteId, loadSchemaNodes } from "@/audit/rules/schema/entity-graph";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const entityTypeDriftRule = defineRule({
  id: "schema-entity-type-drift",
  name: "Schema Type Drift",
  description: "Checks that one absolute @id keeps the same @type across the crawl",
  category: "schema",
  weight: 5,
  run: (context) => {
    const nodes = loadSchemaNodes(context);
    if (!nodes) {
      return notMeasured("schema-entity-type-drift", NEEDS_ENTITY_CRAWL);
    }
    if (nodes.length === 0) {
      return notMeasured("schema-entity-type-drift", NO_SCHEMA_NODES);
    }
    const typesById = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      if (!node.id || !isAbsoluteId(node.id) || node.types.length === 0) continue;
      let set = typesById.get(node.id);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        typesById.set(node.id, set);
      }
      set.add([...node.types].sort().join("+"));
    }
    const drifts = [...typesById.entries()].filter(([, types]) => types.size > 1).map(([id, types]) => `${id}: ${[...types].join(" vs ")}`);
    if (drifts.length === 0) {
      return pass("schema-entity-type-drift", "Absolute @ids keep a consistent @type", {
        drifts: []
      });
    }
    return warn("schema-entity-type-drift", drifts.slice(0, 3).join("; "), {
      drifts,
      recommendation: "Give each @id one @type on every page that declares it."
    });
  }
});
