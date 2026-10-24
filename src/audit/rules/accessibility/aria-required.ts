import type { CheerioAPI, Element } from "cheerio";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const REQUIRED_PARENT: Record<string, string[]> = {
  listitem: ["list"],
  tab: ["tablist"],
  menuitem: ["menu", "menubar"],
  menuitemcheckbox: ["menu", "menubar"],
  option: ["listbox"],
  treeitem: ["tree"]
};
export const REQUIRED_CHILD: Record<string, string> = {
  tablist: "tab",
  menu: "menuitem",
  menubar: "menuitem",
  listbox: "option",
  list: "listitem",
  tree: "treeitem"
};
export function roleOf($: CheerioAPI, el: Element) {
  return ($(el).attr("role") || "").trim().toLowerCase();
}
export function ancestorHasRole($: CheerioAPI, el: Element, roles: string|string[]) {
  let parent = $(el).parent();
  while (parent.length > 0) {
    const role = (parent.attr("role") || "").trim().toLowerCase();
    if (roles.includes(role)) return true;
    parent = parent.parent();
  }
  return false;
}
export const ariaRequiredRule = defineRule({
  id: "a11y-aria-required",
  name: "Required ARIA Structure",
  description: "Checks that explicit ARIA widget roles have their required parent and child roles",
  category: "a11y",
  weight: 4,
  run: (context) => {
    const { $ } = context;
    const issues: string[] = [];
    $("[role]").each((_, el) => {
      const role = roleOf($, el);
      const parents = REQUIRED_PARENT[role];
      if (parents && !ancestorHasRole($, el, parents)) {
        issues.push(`${role} is outside ${parents.join(" or ")}`);
      }
      const child = REQUIRED_CHILD[role];
      if (child) {
        const found = $(el).find("[role]").toArray().some((node) => roleOf($, node) === child);
        if (!found) issues.push(`${role} contains no ${child}`);
      }
    });
    if (issues.length === 0) {
      return pass("a11y-aria-required", "Explicit ARIA widgets have their required roles", {
        issues: []
      });
    }
    return warn("a11y-aria-required", issues.slice(0, 5).join("; "), {
      issues: issues.slice(0, 10),
      total: issues.length,
      recommendation: "Put tab inside tablist, menuitem inside menu, option inside listbox, and give each of those widgets at least one child of the required role."
    });
  }
});
