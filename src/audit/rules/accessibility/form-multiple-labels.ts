import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const formMultipleLabelsRule = defineRule({
  id: "a11y-form-multiple-labels",
  name: "Single Label Per Field",
  description: "Checks that no form control is targeted by more than one <label>",
  category: "a11y",
  weight: 3,
  run: (context) => {
    const { $, url } = context;
    const labelsFor = /* @__PURE__ */ new Map();
    $("label[for]").each((_, el) => {
      const target = $(el).attr("for")?.trim();
      if (!target) return;
      labelsFor.set(target, (labelsFor.get(target) ?? 0) + 1);
    });
    const existingIds = /* @__PURE__ */ new Set();
    $("[id]").each((_, el) => {
      const id = $(el).attr("id")?.trim();
      if (id) existingIds.add(id);
    });
    const multiple = [];
    for (const [id, count] of labelsFor) {
      if (count > 1 && existingIds.has(id)) {
        multiple.push({ id, labels: count });
      }
    }
    const details = { url, multiple };
    if (multiple.length > 0) {
      return warn(
        "a11y-form-multiple-labels",
        `${multiple.length} form control(s) have multiple labels: ${multiple.map((m) => `#${m.id} (${m.labels})`).join(", ")}`,
        details
      );
    }
    return pass("a11y-form-multiple-labels", "No form control has multiple labels", details);
  }
});
