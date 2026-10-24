import type { CheerioAPI } from "cheerio";

export function compareDomElement(raw$: CheerioAPI, rendered$: CheerioAPI, selector: string) {
  if (!rendered$) return null;
  const rawText = raw$(selector).first().text().trim();
  const renderedText = rendered$(selector).first().text().trim();
  return {
    rawText,
    renderedText,
    differs: rawText !== renderedText
  };
}
export function compareAttribute(raw$: CheerioAPI, rendered$: CheerioAPI, selector: string, attribute: string) {
  if (!rendered$) return null;
  const rawValue = raw$(selector).first().attr(attribute);
  const renderedValue = rendered$(selector).first().attr(attribute);
  return {
    rawValue,
    renderedValue,
    differs: rawValue !== renderedValue
  };
}
