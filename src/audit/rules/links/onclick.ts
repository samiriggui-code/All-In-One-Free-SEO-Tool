import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const NAVIGATION_PATTERNS = [
  "window.location",
  "location.href",
  "location.assign",
  "location.replace",
  "document.location"
];
export function containsNavigation(onclick: string) {
  const lower = onclick.toLowerCase();
  return NAVIGATION_PATTERNS.some((pattern) => lower.includes(pattern));
}
export const onclickRule = defineRule({
  id: "links-onclick",
  name: "No Onclick Navigation",
  description: "Checks for elements using onclick handlers for navigation instead of proper href attributes",
  category: "links",
  weight: 5,
  run: (context) => {
    const { $ } = context;
    const found: { element: string; onclick: string; text: string; }[] = [];
    $("a[onclick]").each((_i, el) => {
      const node = $(el);
      const onclick = node.attr("onclick") || "";
      if (containsNavigation(onclick)) {
        found.push({
          element: "a",
          onclick: onclick.slice(0, 100),
          text: node.text().trim().slice(0, 80) || "[no text]"
        });
      }
    });
    $("span[onclick], div[onclick], button[onclick]").each((_i, el) => {
      const node = $(el);
      const onclick = node.attr("onclick") || "";
      if (containsNavigation(onclick)) {
        const tag = el.tagName || "unknown";
        found.push({
          element: tag,
          onclick: onclick.slice(0, 100),
          text: node.text().trim().slice(0, 80) || "[no text]"
        });
      }
    });
    if (found.length > 0) {
      return fail(
        "links-onclick",
        `Found ${found.length} element(s) using onclick for navigation`,
        {
          onclickNavCount: found.length,
          elements: found.slice(0, 10),
          recommendation: 'Use proper <a href="..."> links for navigation so search engines can discover and index linked pages'
        }
      );
    }
    return pass(
      "links-onclick",
      "No onclick-based navigation detected"
    );
  }
});
