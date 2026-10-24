import type { RuleStatus } from "@/audit/types";

/**
 * Rule-by-rule comparison of two audits of the same site.
 *
 * Rows are one result per rule per page; they are rolled up to one status per
 * rule (its worst page) before comparing, so a rule that fails on one page of
 * fifty still reads as failing.
 */

export const RANK: Record<RuleStatus, number> = { pass: 0, warn: 1, fail: 2, "not-measured": -1 };

export type RuleResultRow = {
  ruleId: string;
  ruleName?: string;
  categoryId: string;
  status: RuleStatus;
  message: string;
  /** 0 marks a check that took no reading; null for rows stored without one */
  weight: number | null;
};

type Rollup = {
  ruleId: string;
  ruleName?: string;
  categoryId: string;
  /** Worst measured status; null when no page took a reading */
  status: Exclude<RuleStatus, "not-measured"> | null;
  message: string;
  affectedPages: number;
  totalPages: number;
};

/**
 * How a rule moved between two audits:
 * - `fixed`: failing or warning before, passing now
 * - `regression`: passing before, failing or warning now
 * - `worsened`: warning before, failing now
 * - `improved`: failing before, warning now
 * - `new`: not checked before, failing or warning now
 */
export type RuleChangeKind = "fixed" | "regression" | "worsened" | "improved" | "new" | "removed";

export type RuleChange = {
  ruleId: string;
  ruleName?: string;
  categoryId: string;
  kind: RuleChangeKind;
  from: Rollup["status"];
  to: Rollup["status"];
  message: string;
  affectedPages: number;
  totalPages: number;
};

export type RuleDiff = {
  /** Got worse: regression or worsened */
  regressed: RuleChange[];
  /** Got better: fixed or improved */
  improved: RuleChange[];
  /** First measured in the current audit (any status) */
  added: RuleChange[];
  /** Measured before, not any more */
  removed: RuleChange[];
};

export function isMeasured(row: Pick<RuleResultRow, "weight">): boolean {
  return row.weight === null || row.weight !== 0;
}

export function rollupByRule(rows: Iterable<RuleResultRow>): Map<string, Rollup> {
  const map = new Map<string, Rollup>();
  for (const row of rows) {
    let entry = map.get(row.ruleId);
    if (!entry) {
      entry = {
        ruleId: row.ruleId,
        ruleName: row.ruleName,
        categoryId: row.categoryId,
        status: null,
        message: "",
        affectedPages: 0,
        totalPages: 0,
      };
      map.set(row.ruleId, entry);
    }
    entry.totalPages++;
    if (!isMeasured(row) || row.status === "not-measured") continue;
    if (row.status !== "pass") entry.affectedPages++;
    if (entry.status === null || RANK[row.status] > RANK[entry.status]) {
      entry.status = row.status;
      entry.message = row.message;
    }
  }
  return map;
}

function classify(from: Rollup["status"], to: Rollup["status"]): RuleChangeKind | null {
  if (from === null) return to === null || to === "pass" ? null : "new";
  if (to === null) return "removed";
  if (from === to) return null;
  if (to === "pass") return "fixed";
  if (from === "pass") return "regression";
  return to === "fail" ? "worsened" : "improved";
}

export function diffRules(previous: Iterable<RuleResultRow>, current: Iterable<RuleResultRow>): RuleDiff {
  const before = rollupByRule(previous);
  const after = rollupByRule(current);
  const diff: RuleDiff = { regressed: [], improved: [], added: [], removed: [] };
  for (const now of after.values()) {
    if (now.status === null) continue;
    const then = before.get(now.ruleId);
    const from = then?.status ?? null;
    const change: RuleChange = {
      ruleId: now.ruleId,
      ruleName: now.ruleName,
      categoryId: now.categoryId,
      kind: classify(from, now.status) ?? "new",
      from,
      to: now.status,
      message: now.message,
      affectedPages: now.affectedPages,
      totalPages: now.totalPages,
    };
    if (from === null) {
      diff.added.push(change);
    } else if (RANK[now.status] > RANK[from]) {
      diff.regressed.push(change);
    } else if (RANK[now.status] < RANK[from]) {
      diff.improved.push({ ...change, message: then?.message ?? change.message });
    }
  }
  for (const then of before.values()) {
    if (then.status === null) continue;
    const now = after.get(then.ruleId);
    if (now && now.status !== null) continue;
    diff.removed.push({
      ruleId: then.ruleId,
      ruleName: then.ruleName,
      categoryId: then.categoryId,
      kind: "removed",
      from: then.status,
      to: null,
      message: then.message,
      affectedPages: 0,
      totalPages: now?.totalPages ?? 0,
    });
  }
  const bySeverity = (a: RuleChange, b: RuleChange) =>
    RANK[b.to ?? "pass"] - RANK[a.to ?? "pass"] || a.ruleId.localeCompare(b.ruleId);
  diff.regressed.sort(bySeverity);
  diff.added.sort(bySeverity);
  diff.improved.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  diff.removed.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  return diff;
}
