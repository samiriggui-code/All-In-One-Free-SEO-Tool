import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { findItemsByType } from "@/audit/rules/schema/utils";

export const OFF_TOPIC = /\/(privacy|terms|tos|legal|cookie|login|signin|cart|checkout|account)(\/|$)/i;
export const ratingScopeRule = defineRule({
  id: "schema-rating-scope",
  name: "AggregateRating Scope",
  description: "Checks that AggregateRating is not on a legal or account URL and that ratingValue appears in visible text",
  category: "schema",
  weight: 8,
  run: (context) => {
    const ratings = findItemsByType(context.$, "AggregateRating");
    if (ratings.length === 0) {
      return pass("schema-rating-scope", "No AggregateRating schema", { ratings: 0 });
    }
    let path3 = "";
    try {
      path3 = new URL(context.url).pathname;
    } catch {
      path3 = "";
    }
    const issues = [];
    if (OFF_TOPIC.test(path3)) {
      issues.push(`AggregateRating on ${path3}`);
    }
    const body = context.$("body").clone();
    body.find("script, style, noscript").remove();
    const pageText = body.text();
    const invisible = ratings.map((rating) => rating.data.ratingValue).filter((value) => value !== void 0 && value !== null).map((value) => String(value).trim()).filter((value) => value.length > 0 && !pageText.includes(value));
    if (invisible.length > 0) {
      issues.push(`ratingValue ${invisible.join(", ")} is not in the visible text`);
    }
    if (issues.length === 0) {
      return pass("schema-rating-scope", "AggregateRating is on-topic and visible", {
        ratings: ratings.length
      });
    }
    return warn("schema-rating-scope", issues.join("; "), {
      ratings: ratings.length,
      recommendation: "Put AggregateRating only on the page the rating is about, and show the same ratingValue in the visible text."
    });
  }
});
