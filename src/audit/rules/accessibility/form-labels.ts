import type { AnyNode, Cheerio, CheerioAPI } from "cheerio";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const formLabelsRule = defineRule({
  id: "a11y-form-labels",
  name: "Form Labels",
  description: "Checks that form inputs have associated labels",
  category: "a11y",
  weight: 10,
  run: (context) => {
    const { $ } = context;
    const unlabeledInputs: { type: string; name: string|undefined; id: string|undefined; placeholder?: string|undefined; }[] = [];
    const labeledCount = { total: 0 };
    const inputSelector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])';
    $(inputSelector).each((_, el) => {
      const $el = $(el);
      labeledCount.total++;
      if (!hasLabel($, $el)) {
        unlabeledInputs.push({
          type: $el.attr("type") || "text",
          name: $el.attr("name"),
          id: $el.attr("id"),
          placeholder: $el.attr("placeholder")
        });
      }
    });
    $("select").each((_, el) => {
      const $el = $(el);
      labeledCount.total++;
      if (!hasLabel($, $el)) {
        unlabeledInputs.push({
          type: "select",
          name: $el.attr("name"),
          id: $el.attr("id")
        });
      }
    });
    $("textarea").each((_, el) => {
      const $el = $(el);
      labeledCount.total++;
      if (!hasLabel($, $el)) {
        unlabeledInputs.push({
          type: "textarea",
          name: $el.attr("name"),
          id: $el.attr("id"),
          placeholder: $el.attr("placeholder")
        });
      }
    });
    if (labeledCount.total === 0) {
      return pass("a11y-form-labels", "No form inputs found on page", {
        totalInputs: 0
      });
    }
    if (unlabeledInputs.length === 0) {
      return pass("a11y-form-labels", "All form inputs have associated labels", {
        totalInputs: labeledCount.total
      });
    }
    const percentUnlabeled = Math.round(unlabeledInputs.length / labeledCount.total * 100);
    const message = `${unlabeledInputs.length} of ${labeledCount.total} form inputs lack proper labels`;
    if (percentUnlabeled > 30 || unlabeledInputs.length > 3) {
      return fail("a11y-form-labels", message, {
        unlabeledInputs: unlabeledInputs.slice(0, 10),
        totalUnlabeled: unlabeledInputs.length,
        totalInputs: labeledCount.total,
        note: "Placeholder text is not a substitute for labels"
      });
    }
    return warn("a11y-form-labels", message, {
      unlabeledInputs,
      totalInputs: labeledCount.total,
      note: "Placeholder text is not a substitute for labels"
    });
  }
});
export function hasLabel($: CheerioAPI, $el: Cheerio<AnyNode>) {
  if ($el.attr("aria-label")?.trim()) {
    return true;
  }
  const labelledBy = $el.attr("aria-labelledby");
  if (labelledBy) {
    const labelElement = $(`#${labelledBy.split(" ")[0]}`);
    if (labelElement.length > 0) {
      return true;
    }
  }
  const id = $el.attr("id");
  if (id) {
    const label = $(`label[for="${id}"]`);
    if (label.length > 0 && label.text().trim()) {
      return true;
    }
  }
  const parentLabel = $el.closest("label");
  if (parentLabel.length > 0) {
    const labelText = parentLabel.clone().find("input, select, textarea, button").remove().end().text().trim();
    if (labelText) {
      return true;
    }
  }
  if ($el.attr("title")?.trim()) {
    return true;
  }
  return false;
}
