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
/** Largest declared size of an icon link ("180x180", "any" counts as huge). */
function iconSize(sizes: string | undefined): number {
  if (!sizes) return 0;
  if (/\bany\b/i.test(sizes)) return 1e4;
  return Math.max(0, ...sizes.split(/\s+/).map((s) => Number(s.split(/x/i)[0]) || 0));
}

/**
 * The icon that best stands for the site: an apple-touch-icon (made to be
 * shown large), else the largest `icon` link, else the legacy shortcut icon.
 */
export function pickLogo($: AuditContext["$"]): string | undefined {
  const touch = $('link[rel~="apple-touch-icon"], link[rel~="apple-touch-icon-precomposed"]')
    .toArray()
    .map((el) => ({ href: $(el).attr("href"), size: iconSize($(el).attr("sizes")) }))
    .filter((i) => i.href)
    .sort((a, b) => b.size - a.size);
  if (touch[0]?.href) return clean(touch[0].href, 2000);
  const icons = $('link[rel~="icon"]')
    .toArray()
    .map((el) => ({ href: $(el).attr("href"), size: iconSize($(el).attr("sizes")) }))
    .filter((i) => i.href)
    .sort((a, b) => b.size - a.size);
  return clean(icons[0]?.href, 2000);
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
    logo: pickLogo($),
    themeColor: meta("theme-color"),
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
