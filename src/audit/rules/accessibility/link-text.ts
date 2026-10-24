import type { AnyNode, Cheerio, CheerioAPI } from "cheerio";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const GENERIC_PATTERNS = [
  /^click\s*here$/i,
  /^here$/i,
  /^read\s*more$/i,
  /^more$/i,
  /^learn\s*more$/i,
  /^see\s*more$/i,
  /^view\s*more$/i,
  /^details$/i,
  /^link$/i,
  /^this$/i,
  /^this\s*link$/i,
  /^go$/i,
  /^continue$/i,
  /^info$/i,
  /^information$/i,
  /^download$/i,
  /^pdf$/i
];
export const MIN_LINK_LENGTH = 2;
export const linkTextRule = defineRule({
  id: "a11y-link-text",
  name: "Link Text",
  description: "Checks for descriptive link text",
  category: "a11y",
  weight: 8,
  run: (context) => {
    const { $ } = context;
    const genericLinks: { text: string; href: string; issue: string; }[] = [];
    const linkTextMap = /* @__PURE__ */ new Map();
    let totalLinks = 0;
    $("a[href]").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      const text = getAccessibleText($, $el).toLowerCase().trim();
      if (href.startsWith("#") || href.startsWith("javascript:")) {
        return;
      }
      totalLinks++;
      if (text.length < MIN_LINK_LENGTH) {
        const ariaLabel = $el.attr("aria-label")?.trim();
        if (!ariaLabel) {
          genericLinks.push({
            text: text || "(empty)",
            href: href.slice(0, 50),
            issue: "Link text too short or empty"
          });
        }
        return;
      }
      for (const pattern of GENERIC_PATTERNS) {
        if (pattern.test(text)) {
          const ariaLabel = $el.attr("aria-label")?.trim();
          if (!ariaLabel) {
            genericLinks.push({
              text,
              href: href.slice(0, 50),
              issue: "Generic link text - not descriptive"
            });
          }
          break;
        }
      }
      if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) {
        genericLinks.push({
          text: text.slice(0, 40),
          href: href.slice(0, 50),
          issue: "URL used as link text"
        });
      }
      const normalizedText = text.toLowerCase();
      const existing = linkTextMap.get(normalizedText) || [];
      existing.push(href);
      linkTextMap.set(normalizedText, existing);
    });
    const duplicates = [];
    for (const [text, hrefs] of linkTextMap) {
      const uniqueHrefs = new Set(hrefs.map((h: string) => normalizeHref(h)));
      if (uniqueHrefs.size > 1 && hrefs.length > 1) {
        duplicates.push({ text, count: hrefs.length });
      }
    }
    if (genericLinks.length === 0 && duplicates.length === 0) {
      return pass("a11y-link-text", "All links have descriptive text", {
        totalLinks
      });
    }
    const issues = [];
    for (const link of genericLinks.slice(0, 5)) {
      issues.push(`"${link.text}" - ${link.issue}`);
    }
    for (const dup of duplicates.slice(0, 3)) {
      issues.push(`"${dup.text}" used ${dup.count} times for different destinations`);
    }
    const totalIssues = genericLinks.length + duplicates.length;
    if (totalIssues > 5 || genericLinks.length > 3) {
      return fail(
        "a11y-link-text",
        `Found ${totalIssues} link text accessibility issue(s)`,
        {
          genericLinks: genericLinks.slice(0, 10),
          duplicates: duplicates.slice(0, 5),
          totalLinks,
          issues
        }
      );
    }
    return warn(
      "a11y-link-text",
      `Found ${totalIssues} link text accessibility issue(s)`,
      {
        genericLinks,
        duplicates,
        totalLinks,
        issues
      }
    );
  }
});
export function getAccessibleText($: CheerioAPI, $el: Cheerio<AnyNode>) {
  const ariaLabel = $el.attr("aria-label");
  if (ariaLabel) {
    return ariaLabel;
  }
  const labelledBy = $el.attr("aria-labelledby");
  if (labelledBy) {
    const labelText = $(`#${labelledBy}`).text();
    if (labelText) {
      return labelText;
    }
  }
  let text = $el.text().trim();
  if (!text) {
    const imgAlt = $el.find("img").first().attr("alt");
    if (imgAlt) {
      text = imgAlt;
    }
  }
  if (!text) {
    const svgTitle = $el.find("svg title").first().text();
    if (svgTitle) {
      text = svgTitle;
    }
  }
  return text;
}
export function normalizeHref(href: string) {
  try {
    const url = new URL(href, "http://example.com");
    return url.pathname.replace(/\/$/, "");
  } catch {
    return href.replace(/\/$/, "");
  }
}
