import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const MIN_TITLES = 4;
export const DOMINANT_SHARE = 0.6;
export const SEPARATOR = /\s+[|\-–—]\s+/;
export function suffixOf(title: string) {
  const parts = title.split(SEPARATOR);
  if (parts.length < 2) return null;
  const tail = parts[parts.length - 1].trim();
  if (tail.length < 2 || tail.length > 40) return null;
  return tail.toLowerCase();
}
export const titlePatternRule = defineRule({
  id: "content-title-pattern",
  name: "Title Template",
  description: "Checks that the page title follows the suffix most of the site uses",
  category: "content",
  weight: 3,
  run: (context) => {
    const pages = context.site?.pages;
    if (!pages || (context.site?.pageCount ?? 0) < MIN_TITLES) {
      return notMeasured(
        "content-title-pattern",
        "A title template needs a crawl of at least four titled pages"
      );
    }
    const titles = [];
    for (const info of pages.values()) {
      if (info.title) titles.push(info.title);
    }
    if (titles.length < MIN_TITLES) {
      return pass("content-title-pattern", "Fewer than four titles to infer a template", {
        titles: titles.length
      });
    }
    const counts = /* @__PURE__ */ new Map();
    for (const title of titles) {
      const suffix = suffixOf(title);
      if (!suffix) continue;
      counts.set(suffix, (counts.get(suffix) ?? 0) + 1);
    }
    let dominant = null;
    let dominantCount = 0;
    for (const [suffix, count] of counts) {
      if (count > dominantCount) {
        dominant = suffix;
        dominantCount = count;
      }
    }
    if (!dominant || dominantCount / titles.length < DOMINANT_SHARE) {
      return pass("content-title-pattern", "Titles do not share one suffix", {
        titles: titles.length
      });
    }
    const own = pages.get(context.site!.normalize(context.url))?.title ?? context.$(DOCUMENT_TITLE).first().text().replace(/\s+/g, " ").trim();
    if (!own) {
      return pass("content-title-pattern", "This page has no title to compare", { dominant });
    }
    const ownSuffix = suffixOf(own);
    if (ownSuffix === dominant || own.trim().toLowerCase() === dominant) {
      return pass("content-title-pattern", `Title follows the site suffix "${dominant}"`, {
        dominant
      });
    }
    return warn(
      "content-title-pattern",
      `Title does not use the site suffix "${dominant}" shared by ${dominantCount} pages`,
      {
        title: own,
        dominant,
        dominantCount,
        recommendation: `End the title with the same separator and "${dominant}" the rest of the site uses, or drop the suffix everywhere.`
      }
    );
  }
});
