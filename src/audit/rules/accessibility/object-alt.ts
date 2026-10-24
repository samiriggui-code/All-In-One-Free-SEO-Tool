import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const objectAltRule = defineRule({
  id: "a11y-object-alt",
  name: "Object Alternative Text",
  description: "Checks that <object> elements provide a text alternative",
  category: "a11y",
  weight: 3,
  run: (context) => {
    const { $, url } = context;
    const missing: { type: string; data: string; }[] = [];
    let total = 0;
    $("object").each((_, el) => {
      const $el = $(el);
      total++;
      if ($el.attr("aria-hidden") === "true") return;
      if ($el.text().trim()) return;
      if ($el.attr("title")?.trim() || $el.attr("aria-label")?.trim()) return;
      if ($el.attr("aria-labelledby")?.trim()) return;
      missing.push({
        type: $el.attr("type") ?? "(no type)",
        data: $el.attr("data")?.slice(0, 200) ?? "(no data)"
      });
    });
    const details = { url, total, missing };
    if (total === 0) {
      return pass("a11y-object-alt", "No <object> elements on the page", details);
    }
    if (missing.length > 0) {
      return fail(
        "a11y-object-alt",
        `${missing.length} of ${total} <object> element(s) have no text alternative`,
        details
      );
    }
    return pass("a11y-object-alt", `All ${total} <object> element(s) have alternatives`, details);
  }
});
