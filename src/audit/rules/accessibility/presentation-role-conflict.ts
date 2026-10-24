import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const GLOBAL_ARIA = [
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-current",
  "aria-live",
  "aria-atomic",
  "aria-busy",
  "aria-controls",
  "aria-details",
  "aria-flowto",
  "aria-keyshortcuts",
  "aria-owns",
  "aria-relevant",
  "aria-roledescription"
];
export const presentationRoleConflictRule = defineRule({
  id: "a11y-presentation-role-conflict",
  name: "Presentation Role Conflicts",
  description: 'Checks that role="none"/"presentation" is not negated by ARIA or focusability',
  category: "a11y",
  weight: 3,
  run: (context) => {
    const { $, url } = context;
    const conflicts: { tag: string; reason: string; }[] = [];
    $('[role="none"], [role="presentation"]').each((_, el) => {
      const $el = $(el);
      const tag = (el.tagName ?? "?").toLowerCase();
      const globals = GLOBAL_ARIA.filter((attr) => $el.attr(attr) !== void 0);
      if (globals.length > 0) {
        conflicts.push({ tag, reason: `carries ${globals.join(", ")}` });
      }
      const tabindex = $el.attr("tabindex");
      if (tabindex !== void 0 && Number(tabindex) >= 0) {
        conflicts.push({ tag, reason: `focusable via tabindex="${tabindex}"` });
      }
    });
    const details = { url, conflicts };
    if (conflicts.length > 0) {
      return warn(
        "a11y-presentation-role-conflict",
        `${conflicts.length} element(s) with role="none"/"presentation" are still exposed to assistive technology`,
        details
      );
    }
    return pass("a11y-presentation-role-conflict", "No presentation role conflicts", details);
  }
});
