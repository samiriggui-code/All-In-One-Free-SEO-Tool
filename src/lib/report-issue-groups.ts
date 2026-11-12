/**
 * The report's issues, one entry per rule.
 *
 * The PDF used to print every row of `audit_issues`: a rule broken on 75
 * pages was 75 near-identical paragraphs, and the three rules that
 * mattered were lost between them. Here a rule is printed once, with the
 * pages it was found on as a table underneath.
 *
 * Pure: no database, no PDF.
 */

export type ReportIssue = { severity: string; type: string; url: string; message: string };

export type IssueGroup = {
  type: string;
  /** Rows of this rule at this severity. */
  count: number;
  /** Distinct pages, in the order found. */
  pageCount: number;
  /**
   * What is wrong, when every row says the same thing. Null when the
   * messages differ by page: then each row of `rows` carries its own.
   */
  message: string | null;
  /** One row per finding, capped. `detail` is null when `message` covers it. */
  rows: { url: string; detail: string | null }[];
  /** Findings left out of `rows` by the cap. */
  hidden: number;
};

/**
 * Group one severity's issues by rule. The rules found on the most pages
 * come first; ties keep the order of the audit. `maxGroups` and `maxRows`
 * cap what is printed (Infinity for none).
 */
export function groupIssuesByRule(
  issues: readonly ReportIssue[],
  opts: { maxGroups: number; maxRows: number },
): { groups: IssueGroup[]; hiddenGroups: number } {
  const byType = new Map<string, ReportIssue[]>();
  for (const i of issues) {
    const list = byType.get(i.type);
    if (list) list.push(i);
    else byType.set(i.type, [i]);
  }

  const all: IssueGroup[] = [...byType.entries()].map(([type, list]) => {
    const same = list.every((i) => i.message === list[0].message);
    // The same page with the same detail twice says nothing more.
    const seen = new Set<string>();
    const rows: { url: string; detail: string | null }[] = [];
    for (const i of list) {
      const detail = same ? null : i.message;
      const key = `${i.url}\n${detail ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ url: i.url, detail });
    }
    const shown = rows.slice(0, opts.maxRows);
    return {
      type,
      count: list.length,
      pageCount: new Set(list.map((i) => i.url)).size,
      message: same ? list[0].message : null,
      rows: shown,
      hidden: rows.length - shown.length,
    };
  });

  // Array.prototype.sort is stable: equal counts keep the audit's order.
  all.sort((a, b) => b.pageCount - a.pageCount);
  const groups = all.slice(0, opts.maxGroups);
  return { groups, hiddenGroups: all.length - groups.length };
}
