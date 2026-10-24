import type { AuditContext } from "@/audit/types";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const LOCALE_SEGMENT = /^[a-z]{2}(?:-[a-z0-9]{2,4})?$/i;
export function findTranslationLinks(context: AuditContext) {
  let page;
  try {
    page = new URL(context.url);
  } catch {
    return [];
  }
  const [locale, ...rest] = page.pathname.split("/").filter(Boolean);
  const lang = context.$("html").attr("lang")?.trim().toLowerCase();
  if (!locale || !lang || locale.toLowerCase() !== lang || rest.length === 0) return [];
  const remainder = rest.join("/").replace(/\/$/, "");
  const found = /* @__PURE__ */ new Set();
  for (const link of context.links) {
    if (!link.isInternal) continue;
    let target;
    try {
      target = new URL(link.href);
    } catch {
      continue;
    }
    const [otherLocale, ...otherRest] = target.pathname.split("/").filter(Boolean);
    if (!otherLocale || otherLocale.toLowerCase() === locale.toLowerCase()) continue;
    if (!LOCALE_SEGMENT.test(otherLocale)) continue;
    if (otherRest.join("/").replace(/\/$/, "") !== remainder) continue;
    found.add(`${target.origin}${target.pathname}`);
  }
  return [...found];
}
export const hreflangRule = defineRule({
  id: "i18n-hreflang",
  name: "Hreflang Tags",
  description: "Checks for hreflang link elements for international targeting",
  category: "i18n",
  weight: 10,
  run: (context) => {
    const { $, url } = context;
    const issues = [];
    const hreflangTags: { hreflang: string; href: string; }[] = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      const $el = $(el);
      const hreflang = $el.attr("hreflang") || "";
      const href = $el.attr("href") || "";
      hreflangTags.push({ hreflang, href });
    });
    if (hreflangTags.length === 0) {
      if ((context.headers["link"] ?? "").toLowerCase().includes("hreflang")) {
        return pass("i18n-hreflang", "Hreflang is declared in the HTTP Link header, not in the HTML", {
          count: 0,
          method: "header"
        });
      }
      const translationLinks = findTranslationLinks(context);
      if (translationLinks.length > 0) {
        return warn(
          "i18n-hreflang",
          `Page links to ${translationLinks.length} other-language version(s) of itself but declares no hreflang in the HTML or HTTP headers`,
          {
            count: 0,
            translationLinks: translationLinks.slice(0, 10),
            note: "Ignore if hreflang is declared in the XML sitemap, which this rule does not read",
            recommendation: 'Add <link rel="alternate" hreflang="..."> for every language version, including this page itself'
          }
        );
      }
      return pass("i18n-hreflang", "No hreflang tags found, and no links to other-language versions of this page", {
        count: 0,
        note: "Add hreflang tags if you have multi-language or regional versions"
      });
    }
    let hasSelfReference = false;
    let hasXDefault = false;
    const seenLanguages = /* @__PURE__ */ new Set();
    for (const tag of hreflangTags) {
      const { hreflang, href } = tag;
      if (!hreflang) {
        issues.push({ issue: "Empty hreflang attribute", href });
        continue;
      }
      if (!href) {
        issues.push({ issue: "Empty href attribute", hreflang });
        continue;
      }
      if (hreflang === "x-default") {
        hasXDefault = true;
        continue;
      }
      const langPattern = /^[a-z]{2}(-[A-Z]{2})?$/;
      if (!langPattern.test(hreflang)) {
        issues.push({
          issue: `Invalid hreflang format: "${hreflang}"`,
          hreflang,
          href
        });
      }
      if (seenLanguages.has(hreflang)) {
        issues.push({
          issue: `Duplicate hreflang: "${hreflang}"`,
          hreflang
        });
      }
      seenLanguages.add(hreflang);
      if (href && !href.startsWith("http://") && !href.startsWith("https://")) {
        issues.push({
          issue: "Hreflang href should be absolute URL",
          hreflang,
          href
        });
      }
      try {
        const hrefUrl = new URL(href, url);
        const currentUrl = new URL(url);
        if (hrefUrl.pathname === currentUrl.pathname && hrefUrl.host === currentUrl.host) {
          hasSelfReference = true;
        }
      } catch {
      }
    }
    if (!hasSelfReference) {
      issues.push({
        issue: "Missing self-referencing hreflang for current page"
      });
    }
    if (!hasXDefault && hreflangTags.length > 1) {
      issues.push({
        issue: "Consider adding x-default for fallback language"
      });
    }
    if (issues.length === 0) {
      return pass("i18n-hreflang", `Found ${hreflangTags.length} valid hreflang tags`, {
        count: hreflangTags.length,
        languages: Array.from(seenLanguages),
        hasXDefault,
        hasSelfReference
      });
    }
    const hasCriticalIssues = issues.some(
      (i) => i.issue.includes("Empty") || i.issue.includes("Invalid") || i.issue.includes("Duplicate")
    );
    if (hasCriticalIssues) {
      return fail("i18n-hreflang", `Found ${issues.length} hreflang issue(s)`, {
        count: hreflangTags.length,
        issues: issues.slice(0, 10),
        totalIssues: issues.length
      });
    }
    return warn("i18n-hreflang", `Found ${issues.length} hreflang recommendation(s)`, {
      count: hreflangTags.length,
      issues: issues.slice(0, 10),
      totalIssues: issues.length
    });
  }
});
