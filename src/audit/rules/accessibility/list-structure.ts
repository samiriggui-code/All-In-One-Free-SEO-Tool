import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const ALLOWED_IN_LIST = /* @__PURE__ */ new Set(["li", "script", "template"]);
export const listStructureRule = defineRule({
  id: "a11y-list-structure",
  name: "List Structure",
  description: "Checks that lists contain only list items and that items sit inside a list",
  category: "a11y",
  weight: 4,
  run: (context) => {
    const { $, url } = context;
    const issues: { problem: string; detail: string; }[] = [];
    $("ul, ol").each((_, el) => {
      const parentTag = el.tagName ?? "list";
      $(el).children().each((__, child) => {
        const tag = (child.tagName ?? "").toLowerCase();
        if (ALLOWED_IN_LIST.has(tag)) return;
        issues.push({ problem: "non-list-child", detail: `<${tag}> directly inside <${parentTag}>` });
      });
    });
    $("li").each((_, el) => {
      const parentTag = $(el).parent().get(0)?.tagName;
      const parent = (parentTag ?? "").toLowerCase();
      if (parent === "ul" || parent === "ol" || parent === "menu") return;
      issues.push({ problem: "orphan-li", detail: `<li> inside <${parent || "nothing"}>` });
    });
    $("dt, dd").each((_, el) => {
      const tag = (el.tagName ?? "").toLowerCase();
      if ($(el).closest("dl").length > 0) return;
      issues.push({ problem: "orphan-definition", detail: `<${tag}> outside any <dl>` });
    });
    const details = { url, issues: issues.slice(0, 25), total: issues.length };
    if (issues.length > 0) {
      return fail("a11y-list-structure", `${issues.length} list structure problem(s) found`, details);
    }
    return pass("a11y-list-structure", "List markup is well-formed", details);
  }
});
