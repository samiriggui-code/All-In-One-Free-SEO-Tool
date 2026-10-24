import type { AnyNode, Cheerio, CheerioAPI } from "cheerio";

export const SKIP = "script, style, noscript, textarea, svg, template, pre, code";
export function collectVisibleText($: CheerioAPI) {
  const chunks: string[] = [];
  const visit = (root: Cheerio<AnyNode>) => {
    root.contents().each((_, node) => {
      if (node.type !== "text") return;
      const parent = node.parent;
      if (!parent || parent.type !== "tag") return;
      if ($(parent).closest(SKIP).length > 0) return;
      const text = node.data ?? "";
      if (text.trim().length > 0) chunks.push(text);
    });
  };
  visit($("body"));
  $("body *").each((_, el) => {
    visit($(el));
  });
  return chunks;
}
export const NOT_RENDERED = /* @__PURE__ */ new Set(["script", "style", "noscript"]);
export function bodyText($: CheerioAPI) {
  const parts: string[] = [];
  const walk = (node: AnyNode) => {
    if (node.type === "text") {
      parts.push(node.data);
      return;
    }
    if ("attribs" in node) {
      const tag = node.name.toLowerCase();
      if (NOT_RENDERED.has(tag)) return;
      if (tag === "template" && node.attribs["shadowrootmode"] === void 0) return;
    }
    if ("children" in node) {
      for (const child of node.children) walk(child);
    }
  };
  for (const body of $("body").get()) walk(body);
  return parts.join("").replace(/\s+/g, " ").trim();
}
