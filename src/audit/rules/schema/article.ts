import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { findItemsByType, getMissingFields, hasField } from "@/audit/rules/schema/utils";

export const ARTICLE_TYPES = [
  "Article",
  "NewsArticle",
  "BlogPosting",
  "TechArticle",
  "ScholarlyArticle"
];
export const REQUIRED = ["headline", "author", "datePublished"];
export const RECOMMENDED = [
  "image",
  "publisher",
  "dateModified",
  "description",
  "mainEntityOfPage"
];
export const structuredDataArticleRule = defineRule({
  id: "schema-article",
  name: "Article Schema",
  description: "Validates Article, NewsArticle, BlogPosting, TechArticle, and ScholarlyArticle schemas for required and recommended fields",
  category: "schema",
  weight: 12,
  run: async (context) => {
    const { $ } = context;
    const articles = findItemsByType($, ARTICLE_TYPES);
    if (articles.length === 0) {
      return pass(
        "schema-article",
        "No Article schema found (not required)",
        { articlesFound: 0 }
      );
    }
    const issues = [];
    const warnings = [];
    for (const article of articles) {
      const articleType = article.type;
      const missingRequired = getMissingFields(article, REQUIRED);
      if (missingRequired.length > 0) {
        issues.push(
          `${articleType}: missing required fields: ${missingRequired.join(", ")}`
        );
      }
      if (hasField(article, "author")) {
        const author = article.data.author;
        if (typeof author === "string") {
          warnings.push(
            `${articleType}: author should be a Person or Organization object, not a plain string`
          );
        }
      }
      const missingRecommended = getMissingFields(article, RECOMMENDED);
      if (missingRecommended.length > 0) {
        warnings.push(
          `${articleType}: missing recommended fields: ${missingRecommended.join(", ")}`
        );
      }
    }
    if (issues.length > 0) {
      return fail(
        "schema-article",
        `Article schema validation failed: ${issues.join("; ")}`,
        {
          articlesFound: articles.length,
          issues,
          warnings
        }
      );
    }
    if (warnings.length > 0) {
      return warn(
        "schema-article",
        `Article schema has warnings: ${warnings.join("; ")}`,
        {
          articlesFound: articles.length,
          warnings
        }
      );
    }
    return pass(
      "schema-article",
      `All ${articles.length} Article schema(s) have required fields`,
      {
        articlesFound: articles.length,
        articleTypes: articles.map((a) => a.type)
      }
    );
  }
});
