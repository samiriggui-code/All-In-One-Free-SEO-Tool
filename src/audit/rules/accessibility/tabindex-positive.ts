import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const tabindexPositiveRule = defineRule({
  id: "a11y-tabindex-positive",
  name: "No Positive Tabindex",
  description: "Checks that no element uses a tabindex greater than 0",
  category: "a11y",
  weight: 3,
  run: (context) => {
    const { $, url } = context;
    const offenders: { id?: string|undefined; tag: string; tabindex: number; }[] = [];
    $("[tabindex]").each((_, el) => {
      const $el = $(el);
      const raw = $el.attr("tabindex");
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) return;
      offenders.push({
        tag: (el.tagName ?? "?").toLowerCase(),
        tabindex: value,
        ...$el.attr("id") && { id: $el.attr("id") }
      });
    });
    const details = { url, offenders };
    if (offenders.length > 0) {
      return warn(
        "a11y-tabindex-positive",
        `${offenders.length} element(s) use a positive tabindex, overriding the natural tab order`,
        details
      );
    }
    return pass("a11y-tabindex-positive", "No positive tabindex values", details);
  }
});
