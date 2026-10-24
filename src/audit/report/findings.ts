import { getCategoryById } from "@/audit/engine/categories";
import { isNotMeasured } from "@/audit/engine/define-rule";
import { rulePriority } from "@/audit/engine/priority";
import { getRuleById } from "@/audit/engine/rule-registry";
import type { AuditResult, RuleResult, RuleStatus } from "@/audit/types";

/**
 * One problem, however many pages it appears on.
 *
 * A crawl yields one result per rule per page; a report wants "title too long
 * on 14 of 50 pages", not fourteen copies. Results group by rule, status and
 * message shape (digits folded, so "62 characters" and "71 characters" are
 * the same finding), and are ordered failures first, then by priority.
 */
export type Finding = {
  ruleId: string;
  ruleName: string;
  categoryId: string;
  categoryName: string;
  status: RuleStatus;
  message: string;
  details?: Record<string, unknown>;
  /** Page URLs the finding was seen on, in crawl order */
  pages: string[];
  /** Pages that did not pass */
  pageCount: number;
  /** Pages where the rule took a reading */
  measuredPages: number;
  priority: number;
};

export function normalizeMessage(message: string): string {
  return message.replace(/(?<![A-Za-z0-9])\d+(?:\.\d+)?/g, "N");
}

function pageOf(result: RuleResult): string | null {
  const details = result.details;
  if (!details) return null;
  for (const field of ["pageUrl", "url"]) {
    const value = details[field];
    if (typeof value === "string" && value.startsWith("http")) return value;
  }
  return null;
}

function statusOf(result: RuleResult): RuleStatus {
  return isNotMeasured(result) ? "not-measured" : result.status;
}

const RANK: Record<RuleStatus, number> = { fail: 0, warn: 1, "not-measured": 2, pass: 3 };

export function collectFindings(result: Pick<AuditResult, "categoryResults">): Finding[] {
  const byKey = new Map<string, { finding: Finding; pages: Set<string> }>();
  for (const category of result.categoryResults) {
    const categoryName = getCategoryById(category.categoryId)?.name ?? category.categoryId;
    for (const ruleResult of category.results) {
      const status = statusOf(ruleResult);
      if (status === "pass") continue;
      const key = `${category.categoryId}:${ruleResult.ruleId}:${status}:${normalizeMessage(ruleResult.message)}`;
      const page = pageOf(ruleResult);
      let group = byKey.get(key);
      if (!group) {
        group = {
          finding: {
            ruleId: ruleResult.ruleId,
            ruleName: getRuleById(ruleResult.ruleId)?.name ?? ruleResult.ruleId,
            categoryId: category.categoryId,
            categoryName,
            status,
            message: ruleResult.message,
            details: ruleResult.details,
            pages: [],
            pageCount: 0,
            measuredPages: 0,
            priority: 0,
          },
          pages: new Set(),
        };
        byKey.set(key, group);
      }
      const { finding, pages } = group;
      if (page && !pages.has(page)) {
        pages.add(page);
        finding.pages.push(page);
      }
      finding.pageCount++;
      finding.measuredPages++;
    }
  }
  const findings = [...byKey.values()].map(({ finding }) => {
    finding.priority = rulePriority({
      ruleId: finding.ruleId,
      categoryId: finding.categoryId,
      status: finding.status,
      affectedPages: finding.pageCount,
      measuredPages: finding.measuredPages,
    });
    return finding;
  });
  return findings.sort(
    (a, b) =>
      RANK[a.status] - RANK[b.status] ||
      b.priority - a.priority ||
      b.pageCount - a.pageCount ||
      a.ruleId.localeCompare(b.ruleId),
  );
}
