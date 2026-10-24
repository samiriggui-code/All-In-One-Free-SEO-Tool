import { getCategoryById } from "@/audit/engine/categories";
import { getRuleById } from "@/audit/engine/rule-registry";
import type { PriorityInput, RuleStatus } from "@/audit/types";

export const SEVERITY: Record<RuleStatus, number> = {
  fail: 1,
  warn: 0.5,
  pass: 0,
  "not-measured": 0
};
export function rulePriority(input: PriorityInput): number {
  const rule = getRuleById(input.ruleId);
  const category = getCategoryById(input.categoryId);
  if (!rule || !category) return 0;
  const severity = SEVERITY[input.status];
  if (severity === 0) return 0;
  if (input.measuredPages <= 0) return 0;
  const share = input.affectedPages / input.measuredPages;
  return rule.weight * category.weight * severity * share;
}
export function byPriority<T extends PriorityInput>(items: T[]): T[] {
  const scored = items.map((item) => ({
    item,
    priority: rulePriority(item),
    ruleWeight: getRuleById(item.ruleId)?.weight ?? 0,
    categoryWeight: getCategoryById(item.categoryId)?.weight ?? 0
  }));
  scored.sort(
    (a, b) => b.priority - a.priority || b.ruleWeight - a.ruleWeight || b.categoryWeight - a.categoryWeight || a.item.ruleId.localeCompare(b.item.ruleId)
  );
  return scored.map((s) => s.item);
}
