import type { CheerioAPI } from "cheerio";

export const NON_CONTENT_SELECTOR = 'script, style, noscript, nav, footer, header, aside, [role="navigation"], [role="banner"], [role="contentinfo"], [aria-hidden="true"], .nav, .navigation, .footer, .header, .sidebar';
export function extractMainContent($: CheerioAPI) {
  const body = $("body").clone();
  body.find(NON_CONTENT_SELECTOR).remove();
  return body.text().trim();
}
export const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|co|ai|app|dev|tv|me|info|biz|edu|gov|mil|int|eu|uk|de|fr|es|it|nl|ru|jp|cn|br|in|au|ca|ch|se|no|fi|dk|pl|tr)\b(?:\/\S*)?/gi;
export const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[a-z]{2,}\b/gi;
export function stripUrls(text: string) {
  return text.replace(EMAIL_PATTERN, " ").replace(URL_PATTERN, " ");
}
export function tokenize(text: string) {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((word) => word.length > 0);
}
export function countWords2(text: string) {
  return tokenize(text).length;
}
export function countSentences(text: string) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  return Math.max(1, sentences.length);
}
export function getWordFrequency(words3: string[]) {
  const frequency = /* @__PURE__ */ new Map();
  for (const word of words3) {
    const count = frequency.get(word) || 0;
    frequency.set(word, count + 1);
  }
  return frequency;
}
