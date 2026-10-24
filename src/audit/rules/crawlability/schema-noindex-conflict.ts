import type { CheerioAPI } from "cheerio";
import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const RICH_RESULT_TYPES = [
  "Article",
  "NewsArticle",
  "BlogPosting",
  "Product",
  "Recipe",
  "Event",
  "FAQPage",
  "HowTo",
  "LocalBusiness",
  "Organization",
  "Person",
  "Review",
  "VideoObject",
  "Course",
  "JobPosting",
  "SoftwareApplication",
  "Book",
  "Movie",
  "MusicAlbum",
  "Dataset"
];
export function hasNoindex($: CheerioAPI, headers: Record<string, string>) {
  const robotsMeta = $('meta[name="robots"]').attr("content") || "";
  if (/noindex/i.test(robotsMeta)) {
    return true;
  }
  const googlebotMeta = $('meta[name="googlebot"]').attr("content") || "";
  if (/noindex/i.test(googlebotMeta)) {
    return true;
  }
  const xRobotsTag = headers["x-robots-tag"] || headers["X-Robots-Tag"] || "";
  if (/noindex/i.test(xRobotsTag)) {
    return true;
  }
  return false;
}
export function extractSchemaTypes($: CheerioAPI) {
  const types: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;
      const data = JSON.parse(content);
      if (data["@type"]) {
        const schemaType = Array.isArray(data["@type"]) ? data["@type"] : [data["@type"]];
        types.push(...schemaType);
      }
      if (data["@graph"] && Array.isArray(data["@graph"])) {
        for (const item of data["@graph"]) {
          if (item["@type"]) {
            const schemaType = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
            types.push(...schemaType);
          }
        }
      }
    } catch {
    }
  });
  return types;
}
export const schemaNoindexConflictRule = defineRule({
  id: "crawl-schema-noindex-conflict",
  name: "Schema + Noindex Conflict",
  description: "Detects pages with rich result schema that are blocked from indexing",
  category: "crawl",
  weight: 15,
  run: async (context) => {
    const { $, headers } = context;
    const isNoindexed = hasNoindex($, headers);
    const schemaTypes = extractSchemaTypes($);
    const richResultTypes = schemaTypes.filter(
      (type) => RICH_RESULT_TYPES.some((richType) => type === richType || type.endsWith("/" + richType))
    );
    if (!isNoindexed || richResultTypes.length === 0) {
      return pass(
        "crawl-schema-noindex-conflict",
        isNoindexed ? "Page is noindexed but has no rich result schema (no conflict)" : richResultTypes.length > 0 ? `Page has ${richResultTypes.length} rich result schema type(s) and is indexable` : "Page has no rich result schema",
        {
          isNoindexed,
          schemaTypes,
          richResultTypes
        }
      );
    }
    return fail(
      "crawl-schema-noindex-conflict",
      `Page has ${richResultTypes.length} rich result schema type(s) but is blocked from indexing`,
      {
        isNoindexed: true,
        schemaTypes,
        richResultTypes,
        impact: "Search engines cannot display rich results for noindexed pages",
        recommendation: "Remove noindex to allow rich results, or remove schema markup if page should stay hidden"
      }
    );
  }
});
