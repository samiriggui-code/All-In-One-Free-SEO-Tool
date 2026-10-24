import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const hreflangToRedirectRule = defineRule({
  id: "i18n-hreflang-to-redirect",
  name: "Hreflang to Redirect",
  description: "Checks if hreflang URLs may trigger redirects (HTTP on HTTPS site)",
  category: "i18n",
  weight: 8,
  run: (context) => {
    const { $, url } = context;
    const hreflangElements = $('link[rel="alternate"][hreflang]');
    if (hreflangElements.length === 0) {
      return pass("i18n-hreflang-to-redirect", "No hreflang tags found", {
        count: 0
      });
    }
    let currentUrl;
    try {
      currentUrl = new URL(url);
    } catch {
      return pass("i18n-hreflang-to-redirect", "Cannot parse current URL for comparison", {
        url
      });
    }
    const isCurrentHttps = currentUrl.protocol === "https:";
    const httpUrls: { hreflang: string; href: string; }[] = [];
    const annotations: { hreflang: string; href: string; }[] = [];
    hreflangElements.each((_, el) => {
      const $el = $(el);
      const hreflang = $el.attr("hreflang") || "";
      const href = ($el.attr("href") || "").trim();
      if (!href) return;
      annotations.push({ hreflang, href });
      if (isCurrentHttps && href.startsWith("http://")) {
        httpUrls.push({ hreflang, href });
      }
    });
    const pages = context.site?.pages;
    const redirectingUrls = [];
    if (pages) {
      const normalize = context.site!.normalize;
      for (const { hreflang, href } of annotations) {
        let absolute2;
        try {
          absolute2 = new URL(href, url).href;
        } catch {
          continue;
        }
        const info = pages.get(normalize(absolute2));
        if (!info) continue;
        if (info.statusCode >= 300 && info.statusCode < 400) {
          redirectingUrls.push({ hreflang, href: absolute2, statusCode: info.statusCode });
        }
      }
    }
    if (httpUrls.length === 0 && redirectingUrls.length === 0) {
      if (!isCurrentHttps) {
        return pass(
          "i18n-hreflang-to-redirect",
          pages ? "No hreflang target redirected during the crawl" : "Current page is HTTP; protocol mismatch check not applicable",
          {
            currentProtocol: "http:",
            count: hreflangElements.length
          }
        );
      }
      return pass(
        "i18n-hreflang-to-redirect",
        "All hreflang URLs use the same protocol as the current page",
        {
          count: hreflangElements.length,
          currentProtocol: "https:"
        }
      );
    }
    const issues = [];
    if (httpUrls.length > 0) {
      issues.push(`${httpUrls.length} using HTTP on an HTTPS site`);
    }
    if (redirectingUrls.length > 0) {
      issues.push(`${redirectingUrls.length} returned a 3xx redirect during the crawl`);
    }
    return warn(
      "i18n-hreflang-to-redirect",
      `Found hreflang URL(s) likely to redirect: ${issues.join("; ")}`,
      {
        totalHreflang: hreflangElements.length,
        httpCount: httpUrls.length,
        httpUrls: httpUrls.slice(0, 10),
        redirectCount: redirectingUrls.length,
        redirectingUrls: redirectingUrls.slice(0, 10),
        recommendation: "Update hreflang URLs to point at the final HTTPS destination to avoid redirect chains"
      }
    );
  }
});
