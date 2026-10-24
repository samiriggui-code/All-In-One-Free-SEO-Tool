import { describe, expect, it } from "vitest";
import { articleSlug, buildArticleSchema, extractFaqs, slugify, toExportPost } from "./article-export";

const article = {
  id: 7,
  title: "Pain au levain : la méthode",
  primaryKeyword: "pain au levain",
  outline: null,
  draftMarkdown:
    "# Pain au levain\n\nIntro.\n\n## FAQ\n\n### Combien de temps ?\n\nCompter **24 h** avec [le levain](https://x.fr).\n\n### Quelle farine\n\nT65.\n\n## Conclusion\n\nFin.",
  metaTitle: null,
  metaDescription: "La méthode simple.",
  schemaJsonLd: null,
  publishDate: null,
};
const client = { name: "Boulangerie", url: "https://boulangerie.fr" };

describe("article export helpers", () => {
  it("slugifies accented French titles", () => {
    expect(slugify("Pain au levain : la méthode")).toBe("pain-au-levain-la-methode");
    expect(articleSlug({ ...article, title: "", primaryKeyword: "" })).toBe("article-7");
  });

  it("extracts only headings that are questions, with plain-text answers", () => {
    expect(extractFaqs(article.draftMarkdown)).toEqual([{ q: "Combien de temps ?", a: "Compter 24 h avec le levain." }]);
  });

  it("builds Article + FAQPage schema from the draft", () => {
    const graph = JSON.parse(buildArticleSchema(article, client))["@graph"];
    expect(graph.map((n: { "@type": string }) => n["@type"])).toEqual(["Article", "FAQPage"]);
    expect(graph[0].mainEntityOfPage["@id"]).toBe("https://boulangerie.fr/blog/pain-au-levain-la-methode");
  });

  it("fills export fields and falls back to the title for the SEO title", () => {
    const p = toExportPost(article, client);
    expect(p.metaTitle).toBe(article.title);
    expect(p.slug).toBe("pain-au-levain-la-methode");
    expect(JSON.parse(p.schemaJsonLd)["@graph"]).toHaveLength(2);
  });
});
