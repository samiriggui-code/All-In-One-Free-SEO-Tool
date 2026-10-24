import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { bodyText } from "@/audit/rules/content/utils/visible-text";
import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const TITLE_SOFT_404_PATTERNS = [
  "404",
  "not found",
  "page not found",
  "error"
];
export const H1_SOFT_404_PATTERNS = [
  "404",
  "not found",
  "page not found"
];
export const BODY_SOFT_404_PATTERNS = [
  "not found",
  "doesn't exist",
  "does not exist",
  "no longer available",
  "page removed",
  "page has been removed",
  "page has been deleted",
  "could not be found",
  "cannot be found"
];
export const MIN_WORD_COUNT = 100;
export function countWords(text: string) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}
export function matchesAny(text: string, patterns: string[]) {
  for (const pattern of patterns) {
    if (text.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}
export const soft404Rule = defineRule({
  id: "technical-soft-404",
  name: "Soft 404 Detection",
  description: "Detects pages that return HTTP 200 but display error page content (soft 404)",
  category: "technical",
  weight: 10,
  run: async (context) => {
    const { statusCode, $ } = context;
    if (statusCode === 404) {
      return pass(
        "technical-soft-404",
        "Page correctly returns 404 status code",
        { statusCode }
      );
    }
    if (statusCode !== 200) {
      return pass(
        "technical-soft-404",
        "Page does not return 200 status code; not a soft 404 candidate",
        { statusCode }
      );
    }
    const indicators = [];
    const title = $(DOCUMENT_TITLE).first().text().toLowerCase();
    const titleMatch = matchesAny(title, TITLE_SOFT_404_PATTERNS);
    if (titleMatch) {
      indicators.push(`Title contains "${titleMatch}"`);
    }
    const h1 = $("h1").text().toLowerCase();
    const h1Match = matchesAny(h1, H1_SOFT_404_PATTERNS);
    if (h1Match) {
      indicators.push(`H1 contains "${h1Match}"`);
    }
    const bodyText2 = bodyText($);
    const wordCount = countWords(bodyText2);
    if (wordCount < MIN_WORD_COUNT) {
      const bodyLower = bodyText2.toLowerCase();
      const bodyMatch = matchesAny(bodyLower, BODY_SOFT_404_PATTERNS);
      if (bodyMatch) {
        indicators.push(
          `Body has thin content (${wordCount} words) and contains "${bodyMatch}"`
        );
      }
    }
    if (indicators.length > 0) {
      return fail(
        "technical-soft-404",
        `Page returns 200 but appears to be a soft 404: ${indicators.join("; ")}`,
        {
          statusCode,
          indicators,
          title: title || "(empty)",
          h1: h1 || "(empty)",
          wordCount,
          fix: "Return a proper 404 status code for pages that do not exist"
        }
      );
    }
    return pass(
      "technical-soft-404",
      "Page does not appear to be a soft 404",
      { statusCode, wordCount }
    );
  }
});
