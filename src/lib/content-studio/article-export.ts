import type { ExportPost } from "./exports/common";
import { articleSchema, combineSchemas, faqSchema, type FaqItem } from "./seo/schema";
import type { Outline } from "./types";

/**
 * Turning a stored article into what the exporters, the schema builder
 * and the WordPress publisher need. Pure: no database, no network.
 */

export interface ArticleForExport {
  id: number;
  title: string | null;
  primaryKeyword: string | null;
  outline: Outline | null;
  draftMarkdown: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  schemaJsonLd: string | null;
  publishDate: Date | null;
}

export interface ClientForExport {
  name: string;
  url: string;
}

/** "Pain au levain : la méthode" → "pain-au-levain-la-methode". */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function articleSlug(a: Pick<ArticleForExport, "outline" | "title" | "primaryKeyword" | "id">): string {
  const fromOutline = a.outline?.slug ? slugify(a.outline.slug) : "";
  return fromOutline || slugify(a.title || a.primaryKeyword || "") || `article-${a.id}`;
}

/**
 * Questions and answers from the draft itself, for FAQPage schema.
 *
 * A question is a heading that ends in "?"; its answer is the text up to
 * the next heading. Taken from the draft rather than the outline because
 * schema has to match what the page says, and the writer may have edited
 * either side.
 */
export function extractFaqs(markdown: string): FaqItem[] {
  const out: FaqItem[] = [];
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const h = /^#{2,4}\s+(.+\?)\s*$/.exec(lines[i]);
    if (!h) continue;
    const answer: string[] = [];
    for (let j = i + 1; j < lines.length && !/^#{1,6}\s/.test(lines[j]); j++) {
      if (lines[j].trim()) answer.push(lines[j].trim());
    }
    const a = answer.join(" ").replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
    if (a) out.push({ q: h[1].trim(), a });
  }
  return out;
}

/** Article (+ FAQPage when the draft has questions) JSON-LD. */
export function buildArticleSchema(a: ArticleForExport, client: ClientForExport): string {
  const title = a.title || a.primaryKeyword || "";
  const faqs = extractFaqs(a.draftMarkdown ?? "");
  return combineSchemas(
    articleSchema({
      title,
      description: a.metaDescription ?? "",
      slug: articleSlug(a),
      siteUrl: client.url,
      publisherName: client.name,
      datePublished: a.publishDate?.toISOString(),
    }),
    faqs.length > 0 ? faqSchema(faqs) : null,
  );
}

export function toExportPost(a: ArticleForExport, client: ClientForExport): ExportPost {
  const title = a.title || a.primaryKeyword || "";
  return {
    id: String(a.id),
    title,
    slug: articleSlug(a),
    metaTitle: a.metaTitle || title,
    metaDescription: a.metaDescription ?? "",
    primaryKeyword: a.primaryKeyword ?? "",
    draftMarkdown: a.draftMarkdown ?? "",
    schemaJsonLd: a.schemaJsonLd ?? buildArticleSchema(a, client),
    publishDateISO: a.publishDate?.toISOString(),
    brandName: client.name,
    siteUrl: client.url,
  };
}
