import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const hreflangToBrokenRule = defineRule({
  id: "i18n-hreflang-to-broken",
  name: "Hreflang to Broken URLs",
  description: "Checks hreflang URLs for malformed or obviously broken URLs",
  category: "i18n",
  weight: 10,
  run: (context) => {
    const { $, url } = context;
    const hreflangElements = $('link[rel="alternate"][hreflang]');
    if (hreflangElements.length === 0) {
      return pass("i18n-hreflang-to-broken", "No hreflang tags found", {
        count: 0
      });
    }
    const brokenUrls: { hreflang: string; href: string; reason: string; }[] = [];
    const validUrls: { hreflang: string; href: string; }[] = [];
    hreflangElements.each((_, el) => {
      const $el = $(el);
      const hreflang = $el.attr("hreflang") || "";
      const href = $el.attr("href") || "";
      const trimmedHref = href.trim();
      if (!trimmedHref) {
        brokenUrls.push({ hreflang, href, reason: "Empty href attribute" });
        return;
      }
      if (trimmedHref === "#" || trimmedHref.startsWith("#")) {
        brokenUrls.push({ hreflang, href: trimmedHref, reason: "Fragment-only URL" });
        return;
      }
      if (trimmedHref.toLowerCase().startsWith("javascript:")) {
        brokenUrls.push({ hreflang, href: trimmedHref, reason: "javascript: pseudo-protocol" });
        return;
      }
      try {
        const parsed = new URL(trimmedHref, url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          brokenUrls.push({
            hreflang,
            href: trimmedHref,
            reason: `Non-HTTP protocol: ${parsed.protocol}`
          });
          return;
        }
        validUrls.push({ hreflang, href: parsed.href });
      } catch {
        brokenUrls.push({ hreflang, href: trimmedHref, reason: "URL failed to parse" });
      }
    });
    const pages = context.site?.pages;
    const errorUrls = [];
    const timeoutUrls = [];
    if (pages) {
      const normalize = context.site!.normalize;
      for (const { hreflang, href } of validUrls) {
        const info = pages.get(normalize(href));
        if (!info) continue;
        if (info.statusCode >= 400) {
          errorUrls.push({ hreflang, href, statusCode: info.statusCode });
        } else if (info.statusCode === 0) {
          timeoutUrls.push({ hreflang, href });
        }
      }
    }
    const brokenTotal = brokenUrls.length + errorUrls.length;
    if (brokenTotal === 0 && timeoutUrls.length === 0) {
      return pass(
        "i18n-hreflang-to-broken",
        `All ${validUrls.length} hreflang URL(s) are valid absolute URLs`,
        {
          count: validUrls.length,
          validUrls
        }
      );
    }
    if (brokenTotal === 0) {
      return warn(
        "i18n-hreflang-to-broken",
        `${timeoutUrls.length} hreflang target(s) could not be fetched during the crawl (timeout)`,
        {
          totalHreflang: hreflangElements.length,
          timeoutCount: timeoutUrls.length,
          timeoutUrls: timeoutUrls.slice(0, 10),
          recommendation: "Re-crawl or fetch these URLs manually to confirm they are reachable"
        }
      );
    }
    return fail(
      "i18n-hreflang-to-broken",
      `Found ${brokenTotal} broken hreflang URL(s)`,
      {
        totalHreflang: hreflangElements.length,
        brokenCount: brokenTotal,
        brokenUrls: brokenUrls.slice(0, 10),
        errorCount: errorUrls.length,
        errorUrls: errorUrls.slice(0, 10),
        timeoutUrls: timeoutUrls.slice(0, 10),
        recommendation: "Ensure all hreflang href values are valid absolute HTTP(S) URLs that return a 200 status"
      }
    );
  }
});
