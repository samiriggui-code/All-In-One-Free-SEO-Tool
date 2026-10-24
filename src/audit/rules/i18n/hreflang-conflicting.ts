import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const hreflangConflictingRule = defineRule({
  id: "i18n-hreflang-conflicting",
  name: "Conflicting Hreflang Annotations",
  description: "Checks for hreflang conflicts: one language code pointing to multiple URLs, one URL targeted by multiple codes, or multiple self-referencing codes",
  category: "i18n",
  weight: 10,
  run: (context) => {
    const { $, url } = context;
    const hreflangElements = $('link[rel="alternate"][hreflang]');
    if (hreflangElements.length === 0) {
      return pass("i18n-hreflang-conflicting", "No hreflang tags found", {
        count: 0
      });
    }
    let normalizedCurrentUrl;
    try {
      normalizedCurrentUrl = new URL(url).href;
    } catch {
      normalizedCurrentUrl = url;
    }
    const langToUrls = /* @__PURE__ */ new Map();
    const urlToLangs = /* @__PURE__ */ new Map();
    hreflangElements.each((_, el) => {
      const $el = $(el);
      const hreflang = ($el.attr("hreflang") || "").trim().toLowerCase();
      const href = ($el.attr("href") || "").trim();
      if (!hreflang || !href) return;
      let normalizedHref;
      try {
        const parsed = new URL(href, url);
        normalizedHref = parsed.href;
      } catch {
        normalizedHref = href;
      }
      if (!langToUrls.has(hreflang)) {
        langToUrls.set(hreflang, /* @__PURE__ */ new Set());
      }
      langToUrls.get(hreflang).add(normalizedHref);
      if (hreflang === "x-default") return;
      if (!urlToLangs.has(normalizedHref)) {
        urlToLangs.set(normalizedHref, /* @__PURE__ */ new Set());
      }
      urlToLangs.get(normalizedHref).add(hreflang);
    });
    const conflicts = [];
    for (const [hreflang, urls] of langToUrls) {
      if (urls.size > 1) {
        conflicts.push({
          hreflang,
          urls: Array.from(urls)
        });
      }
    }
    const urlConflicts = [];
    for (const [targetUrl, hreflangs] of urlToLangs) {
      if (hreflangs.size > 1) {
        urlConflicts.push({
          url: targetUrl,
          hreflangs: Array.from(hreflangs)
        });
      }
    }
    const selfReferencingLangs = urlToLangs.get(normalizedCurrentUrl);
    const hasSelfReferenceConflict = selfReferencingLangs !== void 0 && selfReferencingLangs.size > 1;
    if (conflicts.length === 0 && urlConflicts.length === 0 && !hasSelfReferenceConflict) {
      return pass(
        "i18n-hreflang-conflicting",
        "No conflicting hreflang annotations found",
        {
          count: hreflangElements.length,
          uniqueLanguages: langToUrls.size
        }
      );
    }
    const conflictCount = conflicts.length + urlConflicts.length + (hasSelfReferenceConflict ? 1 : 0);
    return fail(
      "i18n-hreflang-conflicting",
      `Found ${conflictCount} hreflang conflict(s)`,
      {
        totalHreflang: hreflangElements.length,
        conflictCount,
        conflicts: conflicts.slice(0, 10),
        urlConflicts: urlConflicts.slice(0, 10),
        selfReferencingLangs: hasSelfReferenceConflict ? Array.from(selfReferencingLangs) : [],
        recommendation: "Each language/region code should point to exactly one URL, each URL should be targeted by exactly one code, and the page should self-reference under a single code. Remove duplicate entries."
      }
    );
  }
});
