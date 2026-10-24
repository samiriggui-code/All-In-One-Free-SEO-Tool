import { isNotMeasured } from "@/audit/engine/define-rule";
import type {
  AuditCoverage,
  AuditResult,
  AuditRunOptions,
  CategoryDefinition,
  CategoryResult,
  PageSnapshot,
  RuleResult,
  RuleStatus,
} from "@/audit/types";

/** Shape version of AuditResult; see the type's documentation. */
export const AUDIT_SCHEMA_VERSION = 2;

export const STATUS_SCORES: Record<RuleStatus, number> = {
  pass: 100,
  warn: 50,
  fail: 0,
  "not-measured": 50
};
export function calculateCategoryScore(results: Pick<RuleResult, "status" | "weight">[]): number {
  if (results.length === 0) {
    return 0;
  }
  let totalScore = 0;
  let totalWeight = 0;
  for (const result of results) {
    const statusScore = STATUS_SCORES[result.status];
    const weight = result.weight ?? 1;
    totalScore += statusScore * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) {
    return 0;
  }
  return Math.round(totalScore / totalWeight);
}
export const SCORING_VERSION = 4;
export function calculateOverallScore(
  categoryResults: Pick<CategoryResult, "categoryId" | "score">[],
  categories2: Pick<CategoryDefinition, "id" | "weight">[],
): number {
  if (categoryResults.length === 0) {
    return 0;
  }
  const categoryWeights = new Map<string, number>();
  for (const category of categories2) {
    categoryWeights.set(category.id, category.weight);
  }
  let totalWeightedScore = 0;
  let totalWeight = 0;
  for (const result of categoryResults) {
    const weight = categoryWeights.get(result.categoryId) ?? 0;
    if (weight > 0) {
      totalWeightedScore += result.score * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight === 0) {
    return 0;
  }
  return Math.round(totalWeightedScore / totalWeight);
}
export function buildCategoryResult(categoryId: string, ruleResults: RuleResult[]): CategoryResult {
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let notMeasuredCount = 0;
  for (const result of ruleResults) {
    if (isNotMeasured(result)) {
      notMeasuredCount++;
      continue;
    }
    switch (result.status) {
      case "pass":
        passCount++;
        break;
      case "warn":
        warnCount++;
        break;
      case "fail":
        failCount++;
        break;
    }
  }
  return {
    categoryId,
    score: calculateCategoryScore(ruleResults),
    passCount,
    warnCount,
    failCount,
    notMeasuredCount,
    results: ruleResults
  };
}
export function buildAuditResult(
  url: string,
  categoryResults: CategoryResult[],
  categories2: CategoryDefinition[],
  timestamp: string,
  crawledPages = 1,
  page?: PageSnapshot,
  run?: AuditRunOptions,
  coverage?: AuditCoverage,
): AuditResult {
  return {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    url,
    overallScore: calculateOverallScore(categoryResults, categories2),
    categoryResults,
    timestamp,
    crawledPages,
    ...page && { page },
    ...run && { run },
    ...coverage && { coverage }
  };
}
