import type { AuditContext, PageSnapshot } from "@/audit/types";
import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { bodyText } from "@/audit/rules/content/utils/visible-text";
import { findOgTag } from "@/audit/rules/social/open-graph";

export const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
export const MAX_HEADINGS = 60;
export function clean(text: string | undefined, limit = 300): string | undefined {
  const trimmed = text?.replace(/\s+/g, " ").trim();
  if (!trimmed) return void 0;
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}\u2026` : trimmed;
}
export function buildPageSnapshot(context: AuditContext): PageSnapshot {
  const { $, html, links, images } = context;
  const meta = (name: string) => clean($(`meta[name="${name}"]`).attr("content"));
  const property = (name: string) => clean(findOgTag($, name)?.content);
  const headings: { level: number; text: string; }[] = [];
  $(HEADING_SELECTOR).each((_, el) => {
    if (headings.length >= MAX_HEADINGS) return;
    const tag = (el.tagName ?? "").toLowerCase();
    const level = Number(tag.slice(1));
    if (!Number.isFinite(level)) return;
    headings.push({ level, text: clean($(el).text(), 120) ?? "(empty)" });
  });
  const bodyText2 = bodyText($);
  const words3 = bodyText2 ? bodyText2.split(" ").length : 0;
  return {
    title: clean($(DOCUMENT_TITLE).first().text()),
    description: meta("description"),
    canonical: clean($('link[rel="canonical"]').attr("href")),
    og: {
      title: property("og:title"),
      description: property("og:description"),
      image: property("og:image"),
      siteName: property("og:site_name"),
      type: property("og:type")
    },
    twitterCard: meta("twitter:card"),
    headings,
    metrics: {
      wordCount: words3,
      internalLinks: links.filter((l) => l.isInternal).length,
      externalLinks: links.filter((l) => !l.isInternal).length,
      images: images.length,
      textRatio: html.length > 0 ? Math.round(bodyText2.length / html.length * 1e3) / 10 : 0
    }
  };
}
