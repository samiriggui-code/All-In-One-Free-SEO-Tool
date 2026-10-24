import type { CheerioAPI } from "cheerio";

export function findOgTag($: CheerioAPI, key: string) {
  for (const attribute of ["property", "name"]) {
    const element = $(`meta[${attribute}="${key}"]`).first();
    if (element.length > 0) {
      return { content: element.attr("content")?.trim() || void 0, attribute };
    }
  }
  return null;
}
export function nameAttributeMessage(label: string, key: string) {
  return `${label} is present but declared as <meta name="${key}">; the Open Graph protocol specifies <meta property="${key}">`;
}
