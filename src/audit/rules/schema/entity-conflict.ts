import { NEEDS_ENTITY_CRAWL, NO_SCHEMA_NODES, isAbsoluteId, loadSchemaNodes } from "@/audit/rules/schema/entity-graph";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const entityConflictRule = defineRule({
  id: "schema-entity-conflict",
  name: "Schema Entity Conflicts",
  description: "Checks that one absolute @id is not declared with conflicting logos or phone numbers",
  category: "schema",
  weight: 6,
  run: (context) => {
    const nodes = loadSchemaNodes(context);
    if (!nodes) {
      return notMeasured("schema-entity-conflict", NEEDS_ENTITY_CRAWL);
    }
    if (nodes.length === 0) {
      return notMeasured("schema-entity-conflict", NO_SCHEMA_NODES);
    }
    const logos = /* @__PURE__ */ new Map();
    const phones = /* @__PURE__ */ new Map();
    const add = (map: Map<string, Set<string>>, id: string, value: string | undefined) => {
      if (!value) return;
      let set = map.get(id);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        map.set(id, set);
      }
      set.add(value);
    };
    for (const node of nodes) {
      if (!node.id || !isAbsoluteId(node.id)) continue;
      add(logos, node.id, node.logo);
      add(phones, node.id, node.telephone);
    }
    const conflicts = [];
    for (const [id, values] of logos) {
      if (values.size > 1) conflicts.push(`${id} has ${values.size} logos`);
    }
    for (const [id, values] of phones) {
      if (values.size > 1) conflicts.push(`${id} has ${values.size} phone numbers`);
    }
    if (conflicts.length === 0) {
      return pass("schema-entity-conflict", "Absolute @ids do not disagree on logo or telephone", {
        conflicts: []
      });
    }
    return warn("schema-entity-conflict", conflicts.slice(0, 5).join("; "), {
      conflicts,
      recommendation: "Use one logo and one telephone for each @id. Pages that describe the same entity should repeat the same values."
    });
  }
});
