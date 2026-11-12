/**
 * Two site-wide checks the audit lacked and separate tools had: filter
 * URLs left open to crawling (tools/facet-trap) and content whose own
 * dates say it is old (tools/freshness). They read the pages the audit
 * already fetched, so they cost no extra request.
 *
 * Pure: no network, no database. lib/audit.ts turns the results into
 * findings.
 */
import { FILTER_PARAM_HINTS } from "./facet-trap";

type CrawledPage = { url: string; html: string };

const isFilterKey = (k: string) => {
  const key = k.toLowerCase();
  return FILTER_PARAM_HINTS.has(key) || key.startsWith("filter_") || key.startsWith("facet_");
};

function filterKeys(url: string): string[] {
  try {
    return [...new URL(url).searchParams.keys()].filter(isFilterKey);
  } catch {
    return [];
  }
}

function canonicalOf(html: string, base: string): string | null {
  const tag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
  const href = tag?.match(/href=["']([^"']+)["']/i)?.[1];
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

const hasNoindex = (html: string) =>
  /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);

export type FacetTrap = {
  /** Distinct filter URLs the crawled pages link to. */
  urlCount: number;
  /** The listing with the most filter URLs, and how many it has. */
  worstPath: string;
  worstCount: number;
  /** The filter parameters seen on that listing. */
  params: string[];
  /** A filter URL, to open and look at. */
  example: string;
};

/** Below this many filter URLs, a site has filters but no trap. */
export const FACET_TRAP_MIN_URLS = 10;

/**
 * Filter URLs (?color=, ?sort=, ?price=…) that the site links to and does
 * nothing to keep out of the index. A filter page that was crawled and
 * points its canonical elsewhere, or is noindex, is handled: its listing
 * is left alone. Null when there is nothing to report.
 */
export function findFacetTrap(pages: readonly CrawledPage[]): FacetTrap | null {
  const origin = (() => {
    try {
      return new URL(pages[0]?.url ?? "").origin;
    } catch {
      return null;
    }
  })();
  if (!origin) return null;

  // Listings whose filter pages are known to be handled.
  const handled = new Set<string>();
  for (const p of pages) {
    if (filterKeys(p.url).length === 0) continue;
    const canonical = canonicalOf(p.html, p.url);
    const away = canonical !== null && filterKeys(canonical).length === 0;
    if (away || hasNoindex(p.html)) handled.add(new URL(p.url).pathname);
  }

  const byPath = new Map<string, { urls: Set<string>; params: Set<string> }>();
  for (const p of pages) {
    for (const m of p.html.matchAll(/<a\s+[^>]*href=["']([^"'#]+)["']/gi)) {
      let u: URL;
      try {
        u = new URL(m[1], p.url);
      } catch {
        continue;
      }
      if (u.origin !== origin) continue;
      const keys = filterKeys(u.toString());
      if (keys.length === 0 || handled.has(u.pathname)) continue;
      const entry = byPath.get(u.pathname) ?? { urls: new Set(), params: new Set() };
      entry.urls.add(u.toString());
      for (const k of keys) entry.params.add(k.toLowerCase());
      byPath.set(u.pathname, entry);
    }
  }

  let urlCount = 0;
  let worst: [string, { urls: Set<string>; params: Set<string> }] | null = null;
  for (const entry of byPath) {
    urlCount += entry[1].urls.size;
    if (!worst || entry[1].urls.size > worst[1].urls.size) worst = entry;
  }
  if (!worst || urlCount < FACET_TRAP_MIN_URLS) return null;
  return {
    urlCount,
    worstPath: worst[0],
    worstCount: worst[1].urls.size,
    params: [...worst[1].params].sort(),
    example: [...worst[1].urls][0],
  };
}

/** Content dated more than this many months ago counts as stale. */
export const STALE_AFTER_MONTHS = 24;

/** The newest date a page gives for itself, or null when it gives none. */
export function pageDate(html: string): Date | null {
  const found: number[] = [];
  const add = (value: string | undefined) => {
    if (!value) return;
    const t = Date.parse(value);
    if (!Number.isNaN(t)) found.push(t);
  };
  for (const m of html.matchAll(/"date(?:Modified|Published)"\s*:\s*"([^"]+)"/g)) add(m[1]);
  for (const m of html.matchAll(
    /<meta\b[^>]*property=["']article:(?:modified|published)_time["'][^>]*>/gi,
  )) {
    add(m[0].match(/content=["']([^"']+)["']/i)?.[1]);
  }
  return found.length > 0 ? new Date(Math.max(...found)) : null;
}

export type StaleContent = {
  /** Pages whose newest date is older than the threshold. */
  count: number;
  /** Pages that give a date at all. */
  dated: number;
  /** The oldest of them. */
  oldestUrl: string;
  oldestYear: number;
};

/**
 * Pages whose own dates (schema dateModified/datePublished, article
 * meta tags) are older than STALE_AFTER_MONTHS. Pages with no date are
 * not counted: undated is not the same as old. Null when none is stale.
 */
export function findStaleContent(pages: readonly CrawledPage[], now: Date): StaleContent | null {
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - STALE_AFTER_MONTHS);
  let dated = 0;
  let count = 0;
  let oldest: { url: string; date: Date } | null = null;
  for (const p of pages) {
    const date = pageDate(p.html);
    if (!date) continue;
    dated++;
    if (date >= limit) continue;
    count++;
    if (!oldest || date < oldest.date) oldest = { url: p.url, date };
  }
  if (!oldest) return null;
  return { count, dated, oldestUrl: oldest.url, oldestYear: oldest.date.getFullYear() };
}
