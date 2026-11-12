/**
 * Keyword cannibalization: queries for which two or more pages of the
 * same site show up in Google, splitting clicks between them.
 *
 * One engine for the two tabs of the cannibalization family: the tool
 * (/tools/cannibalization, any Search Console property) and the project
 * view (/cannibalization/c/<id>). Both start from the same Search Console
 * rows (dimensions query + page); each keeps its own thresholds, kept
 * as they were before the merge, in the two rule sets below.
 *
 * Client-safe: pure functions, no fetch.
 */

export type GscQueryPageRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type CannibalPage = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type CannibalSeverity = "high" | "medium" | "low";

export type CannibalRules = {
  /** Pages that count as competing for a query. */
  keep: (p: CannibalPage) => boolean;
  /**
   * When `keep` is applied. "page": every row is grouped first, then
   * the weak pages are dropped, so queriesAnalyzed counts every query.
   * "row": weak rows are dropped before grouping. Also decides the order
   * of groups that tie on severity and traffic (order of first row).
   */
  keepAt: "page" | "row";
  /** Severity of a group, from its pages sorted best position first. */
  severity: (pages: CannibalPage[]) => CannibalSeverity;
  /** Order within one severity: most clicks or most impressions first. */
  rankBy: "clicks" | "impressions";
};

/**
 * The tool's rules. A page competes from 5 impressions and an average
 * position in the top 30.
 *   high   — 2+ pages with 10+ impressions, all in the top 20
 *   medium — 2+ pages with 10+ impressions, mixed positions
 *   low    — pages compete but one is clearly winning
 */
export const TOOL_RULES: CannibalRules = {
  keep: (p) => p.impressions >= 5 && p.position <= 30,
  keepAt: "page",
  severity: (pages) => {
    const serious = pages.filter((p) => p.impressions >= 10);
    const allTop20 = pages.every((p) => p.position <= 20);
    if (serious.length >= 2 && allTop20) return "high";
    if (serious.length >= 2) return "medium";
    return "low";
  },
  rankBy: "clicks",
};

/**
 * The project view's rules. A page competes from `minImpressions`
 * impressions (30 by default), whatever its position.
 *   high   — 3+ pages, OR 2 pages both within the top 20
 *   medium — 2 pages, one in top 20 and one beyond
 *   low    — 2 pages, both beyond position 20
 */
export function projectRules(minImpressions = 30): CannibalRules {
  return {
    keep: (p) => p.impressions >= minImpressions,
    keepAt: "row",
    severity: (pages) => {
      const top20 = pages.filter((p) => p.position <= 20).length;
      if (pages.length >= 3 || top20 >= 2) return "high";
      if (top20 >= 1) return "medium";
      return "low";
    },
    rankBy: "impressions",
  };
}

export type CannibalizationGroup = {
  query: string;
  /** Best (lowest) average position first. */
  pages: CannibalPage[];
  totalClicks: number;
  totalImpressions: number;
  severity: CannibalSeverity;
};

const SEVERITY_RANK: Record<CannibalSeverity, number> = { high: 0, medium: 1, low: 2 };

/**
 * Groups Search Console rows by query and keeps the queries where at
 * least two pages compete. Most harmful first: by severity, then by
 * clicks or impressions at stake.
 */
export function groupCannibalization(
  rows: readonly GscQueryPageRow[],
  rules: CannibalRules,
): { groups: CannibalizationGroup[]; queriesAnalyzed: number } {
  const byQuery = new Map<string, Map<string, CannibalPage>>();
  for (const r of rows) {
    const [query, page] = r.keys;
    if (!query || !page) continue;
    const entry: CannibalPage = {
      page,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    };
    if (rules.keepAt === "row" && !rules.keep(entry)) continue;
    const pages = byQuery.get(query) ?? new Map<string, CannibalPage>();
    pages.set(page, entry);
    byQuery.set(query, pages);
  }

  const groups: CannibalizationGroup[] = [];
  for (const [query, pageMap] of byQuery) {
    let pages = [...pageMap.values()];
    if (rules.keepAt === "page") pages = pages.filter(rules.keep);
    if (pages.length < 2) continue;
    pages.sort((a, b) => a.position - b.position);
    groups.push({
      query,
      pages,
      totalClicks: pages.reduce((s, p) => s + p.clicks, 0),
      totalImpressions: pages.reduce((s, p) => s + p.impressions, 0),
      severity: rules.severity(pages),
    });
  }

  const at = rules.rankBy === "clicks" ? "totalClicks" : "totalImpressions";
  groups.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b[at] - a[at],
  );

  return { groups, queriesAnalyzed: byQuery.size };
}
