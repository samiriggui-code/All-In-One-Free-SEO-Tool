import type { JsonLd } from "@/audit/rules/schema/utils";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const authorBylineRule = defineRule({
  id: "eeat-author-byline",
  name: "Author Bylines",
  description: "Checks for visible author names on content pages",
  category: "eeat",
  weight: 8,
  run: async (context) => {
    const { $ } = context;
    const signals = [];
    const jsonLdScripts = $('script[type="application/ld+json"]');
    let schemaAuthor = null;
    jsonLdScripts.each((_, el) => {
      try {
        const content = $(el).html();
        if (content) {
          const data = JSON.parse(content);
          const checkAuthor = (obj: JsonLd): string | null => {
            if (!obj || typeof obj !== "object") return null;
            const record = obj;
            if (record.author) {
              if (typeof record.author === "string") return record.author;
              if (typeof record.author === "object") {
                const author = record.author;
                return author.name || null;
              }
            }
            if (Array.isArray(record["@graph"])) {
              for (const item of record["@graph"]) {
                const found2 = checkAuthor(item);
                if (found2) return found2;
              }
            }
            return null;
          };
          const found = checkAuthor(data);
          if (found) schemaAuthor = found;
        }
      } catch {
      }
    });
    if (schemaAuthor) {
      signals.push(`Schema.org author: "${schemaAuthor}"`);
    }
    const authorLink = $('a[rel="author"]').first();
    if (authorLink.length > 0) {
      const authorName = authorLink.text().trim() || authorLink.attr("href");
      signals.push(`rel="author" link: "${authorName}"`);
    }
    const metaAuthor = $('meta[name="author"]').attr("content")?.trim();
    if (metaAuthor) {
      signals.push(`Meta author: "${metaAuthor}"`);
    }
    const bylineSelectors = [
      ".author",
      ".byline",
      ".written-by",
      ".post-author",
      ".article-author",
      '[class*="author"]',
      '[class*="byline"]',
      '[rel="author"]',
      '[itemprop="author"]'
    ];
    for (const selector of bylineSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text && text.length < 100) {
          signals.push(`Byline element (${selector}): "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`);
          break;
        }
      }
    }
    if (signals.length > 0) {
      return pass(
        "eeat-author-byline",
        `Author byline found (${signals.length} signal${signals.length > 1 ? "s" : ""})`,
        {
          signals,
          impact: "Author attribution supports E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)"
        }
      );
    }
    return warn("eeat-author-byline", "No author byline found", {
      signals: [],
      recommendation: "Add author attribution using Schema.org Person markup, meta author tag, or visible byline",
      impact: "Missing author info can negatively impact E-E-A-T signals, especially for YMYL content"
    });
  }
});
