
export const ARTICLE = /* @__PURE__ */ new Set(["Article", "NewsArticle", "BlogPosting", "TechArticle", "ScholarlyArticle"]);
export const PRODUCT = /* @__PURE__ */ new Set(["Product"]);
export function pageKindFrom(types: string[], url: string) {
  if (types.some((type) => ARTICLE.has(type))) return "article";
  if (types.some((type) => PRODUCT.has(type))) return "product";
  try {
    const path3 = new URL(url).pathname.toLowerCase();
    if (/\/(blog|news|articles|posts)(\/|$)/.test(path3)) return "article";
    if (/\/(product|products|shop)(\/|$)/.test(path3)) return "product";
  } catch {
  }
  return "other";
}
