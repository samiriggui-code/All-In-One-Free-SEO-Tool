import type { AuditRule, RuleResult } from "@/audit/types";

type Details = Record<string, unknown> | undefined;

export function validateRule(rule: AuditRule): void {
  const errors: string[] = [];
  if (!rule.id || typeof rule.id !== "string") {
    errors.push('Rule must have a string "id"');
  }
  if (!rule.name || typeof rule.name !== "string") {
    errors.push('Rule must have a string "name"');
  }
  if (!rule.description || typeof rule.description !== "string") {
    errors.push('Rule must have a string "description"');
  }
  if (!rule.category || typeof rule.category !== "string") {
    errors.push('Rule must have a string "category"');
  }
  if (typeof rule.weight !== "number" || rule.weight < 0 || rule.weight > 100) {
    errors.push('Rule must have a "weight" number between 0 and 100');
  }
  if (typeof rule.run !== "function") {
    errors.push('Rule must have a "run" function');
  }
  if (errors.length > 0) {
    throw new Error(`Invalid rule definition:
  - ${errors.join("\n  - ")}`);
  }
}

export function defineRule(rule: AuditRule): AuditRule {
  validateRule(rule);
  return rule;
}

export function pass(ruleId: string, message: string, details?: Details): RuleResult {
  return {
    ruleId,
    status: "pass",
    message,
    score: 100,
    ...(details && { details }),
  };
}

export function warn(ruleId: string, message: string, details?: Details): RuleResult {
  return {
    ruleId,
    status: "warn",
    message,
    score: 50,
    ...(details && { details }),
  };
}

export function notMeasured(ruleId: string, message: string, details?: Details): RuleResult {
  return {
    ruleId,
    status: "not-measured",
    message,
    // Kept at 50 as the reference does: the status carries the meaning and
    // weight 0 keeps it out of every average.
    score: 50,
    weight: 0,
    ...(details && { details }),
  };
}

export function isNotMeasured(result: Pick<RuleResult, "status" | "weight">): boolean {
  return result.status === "not-measured" || result.weight === 0;
}

export function fail(ruleId: string, message: string, details?: Details): RuleResult {
  return {
    ruleId,
    status: "fail",
    message,
    score: 0,
    ...(details && { details }),
  };
}
