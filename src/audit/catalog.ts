/**
 * The rule catalogue without the engine: rules, categories, fix text and
 * verdicts. For pages that label stored results, so they never pull in
 * the crawler or the browser.
 *
 * Importing this module registers every rule, so `getRuleById` and
 * `getRuleCount` answer for the whole catalogue whichever module asks first.
 */
import "@/audit/rules";

export { categories, getCategoryById, getCategoryIds } from "@/audit/engine/categories";
export { getAllRules, getRuleById, getRuleCount } from "@/audit/engine/rule-registry";
export { getFixSuggestion } from "@/audit/engine/fix-suggestions";
export { scoreToVerdict } from "@/audit/report/verdict";
export type {
  AuditResult,
  CategoryResult,
  CoreWebVitals,
  RuleResult,
  RuleStatus,
} from "@/audit/types";
