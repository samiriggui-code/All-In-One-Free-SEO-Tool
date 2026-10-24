import type { CheerioAPI } from "cheerio";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const CRITICAL_ORIGINS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "www.google-analytics.com",
  "www.googletagmanager.com",
  "connect.facebook.net",
  "platform.twitter.com",
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "unpkg.com",
  "ajax.googleapis.com"
];
export function extractOrigin(url: string) {
  try {
    const parsed = new URL(url, "https://example.com");
    if (parsed.hostname === "example.com") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}
export function analyzePreconnects($: CheerioAPI, pageUrl: string) {
  const preconnects: string[] = [];
  const dnsPrefetches: string[] = [];
  const thirdPartyOrigins = new Set<string>();
  let pageOrigin2;
  try {
    pageOrigin2 = new URL(pageUrl).origin;
  } catch {
    pageOrigin2 = "";
  }
  $('link[rel="preconnect"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try {
        const origin = new URL(href).origin;
        preconnects.push(origin);
      } catch {
        preconnects.push(href);
      }
    }
  });
  $('link[rel="dns-prefetch"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      dnsPrefetches.push(href.replace(/^\/\//, "https://"));
    }
  });
  const collectOrigins = (selector: string, attr: string) => {
    $(selector).each((_, el) => {
      const url = $(el).attr(attr);
      if (url) {
        const origin = extractOrigin(url);
        if (origin && origin !== pageOrigin2) {
          thirdPartyOrigins.add(origin);
        }
      }
    });
  };
  collectOrigins("script[src]", "src");
  collectOrigins("img[src]", "src");
  collectOrigins('link[rel="stylesheet"]', "href");
  collectOrigins("iframe[src]", "src");
  const existingHints = /* @__PURE__ */ new Set([
    ...preconnects,
    ...dnsPrefetches.map((d) => {
      try {
        return new URL(d).origin;
      } catch {
        return d;
      }
    })
  ]);
  const missingPreconnects = [];
  for (const origin of thirdPartyOrigins) {
    const hostname = new URL(origin).hostname;
    const isCritical = CRITICAL_ORIGINS.some(
      (critical) => hostname === critical || hostname.endsWith(`.${critical}`)
    );
    if (isCritical && !existingHints.has(origin)) {
      missingPreconnects.push(origin);
    }
  }
  return {
    preconnects,
    dnsPrefetches,
    thirdPartyOrigins: Array.from(thirdPartyOrigins),
    missingPreconnects
  };
}
export const preconnectRule = defineRule({
  id: "perf-preconnect",
  name: "Preconnect Hints",
  description: "Checks for preconnect hints to critical third-party origins",
  category: "perf",
  weight: 15,
  run: (context) => {
    const { $, url } = context;
    const analysis = analyzePreconnects($, url);
    const details = {
      preconnects: analysis.preconnects,
      dnsPrefetches: analysis.dnsPrefetches,
      thirdPartyOrigins: analysis.thirdPartyOrigins.slice(0, 10),
      missingPreconnects: analysis.missingPreconnects,
      criticalOrigins: CRITICAL_ORIGINS
    };
    if (analysis.thirdPartyOrigins.length === 0) {
      return pass("perf-preconnect", "No third-party origins detected", details);
    }
    if (analysis.missingPreconnects.length > 0) {
      const missing = analysis.missingPreconnects.slice(0, 5);
      return warn(
        "perf-preconnect",
        `Missing preconnect for ${analysis.missingPreconnects.length} critical origin(s): ${missing.join(", ")}`,
        details
      );
    }
    const hintCount = analysis.preconnects.length + analysis.dnsPrefetches.length;
    if (hintCount > 0) {
      return pass(
        "perf-preconnect",
        `Preconnect hints configured (${hintCount} origin(s))`,
        details
      );
    }
    return pass(
      "perf-preconnect",
      `${analysis.thirdPartyOrigins.length} third-party origin(s) detected (no critical origins requiring preconnect)`,
      details
    );
  }
});
