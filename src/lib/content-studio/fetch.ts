import * as cheerio from "cheerio";
import { guardedFetch } from "@/lib/url-guard";
import { REPO_UA_SUFFIX } from "@/lib/repo";

/**
 * Page fetching for the content studio.
 *
 * BlogPilot had its own fetcher and SSRF guard. Both go through this
 * app's `guardedFetch`, which checks every redirect hop (BlogPilot's
 * guard only checked the first URL) and resolves DNS before trusting a
 * hostname.
 */

export interface FetchResult {
  html: string;
  finalUrl: string;
  status: number;
}

const UA = `Mozilla/5.0 (compatible; SEOToolContentStudio/1.0; ${REPO_UA_SUFFIX})`;

export async function fetchHtml(url: string, signal?: AbortSignal): Promise<FetchResult> {
  const r = await guardedFetch(url, {
    signal: signal ?? AbortSignal.timeout(20_000),
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const html = await r.text();
  return { html, finalUrl: r.url || url, status: r.status };
}

export function load(html: string) {
  return cheerio.load(html);
}

export interface SmartFetchResult extends FetchResult {
  rendered: boolean;
}

/**
 * Rendered fetch for JS-heavy pages, with a plain fetch as fallback when
 * Chromium is unavailable or the render fails.
 */
export async function fetchHtmlSmart(url: string): Promise<SmartFetchResult> {
  try {
    const { guardUrl } = await import("@/lib/url-guard");
    const verdict = await guardUrl(url);
    if (verdict.ok) {
      const { renderAndCapture } = await import("@/lib/render-capture");
      const r = await renderAndCapture(url, { screenshot: false, waitUntil: "domcontentloaded" });
      if (r.ok && r.html) {
        return { html: r.html, finalUrl: r.finalUrl ?? url, status: r.status ?? 200, rendered: true };
      }
    }
  } catch {
    // fall through to the plain fetch
  }
  const r = await fetchHtml(url);
  return { ...r, rendered: false };
}

export interface SitemapResult {
  urls: string[];
  count: number;
}

const SITEMAP_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"];

export async function parseSitemap(baseUrl: string): Promise<SitemapResult> {
  for (const p of SITEMAP_PATHS) {
    try {
      const u = new URL(p, baseUrl).toString();
      const r = await fetchHtml(u);
      if (r.status >= 400) continue;
      const $ = load(r.html);
      const urls: string[] = [];
      $("loc").each((_, el) => {
        urls.push($(el).text().trim());
      });
      if (urls.length === 0) continue;

      // A sitemap index of nested xml files: drill in once.
      if (urls[0].endsWith(".xml") && urls.length < 50) {
        const all: string[] = [];
        for (const sm of urls.slice(0, 5)) {
          try {
            const rr = await fetchHtml(sm);
            const $$ = load(rr.html);
            $$("loc").each((_, el) => {
              all.push($$(el).text().trim());
            });
          } catch {
            // ignore single sitemap failures
          }
        }
        if (all.length > 0) return { urls: all, count: all.length };
      }
      return { urls, count: urls.length };
    } catch {
      // try next
    }
  }
  return { urls: [], count: 0 };
}
