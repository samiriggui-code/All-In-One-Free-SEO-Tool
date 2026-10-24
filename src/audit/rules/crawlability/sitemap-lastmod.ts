import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";
import { registerResettable } from "@/audit/engine/rule-registry";
import type { SitemapEntry } from "@/audit/types";

export const IDENTICAL_RATIO_THRESHOLD = 0.9;
export const MIN_ENTRIES_TO_JUDGE = 10;
export const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1e3;
type LastmodAnalysis = ReturnType<typeof analyse>;
export let cachedResult: { key: string; value: LastmodAnalysis } | null = null;
export function resetSitemapLastmodCache() {
  cachedResult = null;
}
registerResettable(resetSitemapLastmodCache);
export function analyse(entries: SitemapEntry[], now: number) {
  const counts = new Map<string, number>();
  const invalid: string[] = [];
  const future: string[] = [];
  let withLastmod = 0;
  for (const entry of entries) {
    if (!entry.lastmod) continue;
    withLastmod++;
    const parsed = Date.parse(entry.lastmod);
    if (Number.isNaN(parsed)) {
      if (invalid.length < 5) invalid.push(`${entry.loc} (${entry.lastmod})`);
      continue;
    }
    if (parsed > now + FUTURE_TOLERANCE_MS) {
      if (future.length < 5) future.push(`${entry.loc} (${entry.lastmod})`);
    }
    const day2 = new Date(parsed).toISOString().slice(0, 10);
    counts.set(day2, (counts.get(day2) ?? 0) + 1);
  }
  let mostCommonDate: string | undefined;
  let mostCommonCount = 0;
  for (const [day2, count] of counts) {
    if (count > mostCommonCount) {
      mostCommonDate = day2;
      mostCommonCount = count;
    }
  }
  return {
    total: entries.length,
    withLastmod,
    invalid,
    future,
    ...mostCommonDate !== void 0 && { mostCommonDate },
    mostCommonCount
  };
}
export const sitemapLastmodRule = defineRule({
  id: "crawl-sitemap-lastmod",
  name: "Sitemap lastmod Quality",
  description: "Checks sitemap <lastmod> values for invalid dates, future dates, and bulk-identical timestamps",
  category: "crawl",
  weight: 5,
  run: (context) => {
    const entries = context.sitemapEntries;
    if (entries === void 0) {
      return notMeasured(
        "crawl-sitemap-lastmod",
        "Sitemap not available, so lastmod values could not be checked"
      );
    }
    if (entries.length === 0) {
      return pass("crawl-sitemap-lastmod", "No sitemap entries to check", { entryCount: 0 });
    }
    const key = `${entries.length}:${entries[0]?.loc ?? ""}`;
    if (!cachedResult || cachedResult.key !== key) {
      cachedResult = { key, value: analyse(entries, Date.now()) };
    }
    const analysis = cachedResult.value;
    const details = {
      entryCount: analysis.total,
      withLastmod: analysis.withLastmod,
      invalidDates: analysis.invalid,
      futureDates: analysis.future,
      mostCommonDate: analysis.mostCommonDate,
      mostCommonDateCount: analysis.mostCommonCount
    };
    if (analysis.withLastmod === 0) {
      return warn(
        "crawl-sitemap-lastmod",
        `No sitemap entries declare <lastmod> (${analysis.total} URLs)`,
        {
          ...details,
          recommendation: "Add <lastmod> reflecting genuine content changes so crawlers can prioritise what actually changed."
        }
      );
    }
    if (analysis.invalid.length > 0) {
      return warn(
        "crawl-sitemap-lastmod",
        `${analysis.invalid.length} sitemap entr(ies) have an unparseable <lastmod>: ${analysis.invalid[0]}`,
        {
          ...details,
          recommendation: "lastmod must be a W3C Datetime, e.g. 2026-08-31 or 2026-08-31T12:00:00+00:00."
        }
      );
    }
    if (analysis.future.length > 0) {
      return warn(
        "crawl-sitemap-lastmod",
        `${analysis.future.length} sitemap entr(ies) declare a <lastmod> in the future: ${analysis.future[0]}`,
        details
      );
    }
    const ratio = analysis.withLastmod > 0 ? analysis.mostCommonCount / analysis.withLastmod : 0;
    if (analysis.withLastmod >= MIN_ENTRIES_TO_JUDGE && ratio >= IDENTICAL_RATIO_THRESHOLD) {
      return warn(
        "crawl-sitemap-lastmod",
        `${analysis.mostCommonCount} of ${analysis.withLastmod} URLs share the same <lastmod> (${analysis.mostCommonDate}), which looks generated rather than genuine`,
        {
          ...details,
          impact: "Google discounts lastmod on sites where it does not track real changes, so an inaccurate value forfeits the signal for every URL."
        }
      );
    }
    return pass(
      "crawl-sitemap-lastmod",
      `Sitemap <lastmod> values look genuine (${analysis.withLastmod}/${analysis.total} URLs dated)`,
      details
    );
  }
});
