import type { AuditContext, RuleResult } from "@/audit/types";
import type { CheerioAPI } from "cheerio";
import { notMeasured } from "@/audit/engine/define-rule";

export type ParityInputs =
  | { available: false; result: RuleResult }
  | { available: true; desktop: CheerioAPI; mobile: CheerioAPI };
export function parityInputs(ruleId: string, context: AuditContext): ParityInputs {
  if (!context.rendered$ || !context.mobile$) {
    return {
      available: false as const,
      result: notMeasured(
        ruleId,
        "Mobile parity not measured - run with --mobile (and without --no-cwv) to render desktop and mobile and compare them"
      )
    };
  }
  return { available: true as const, desktop: context.rendered$, mobile: context.mobile$ };
}
export function firstText($: CheerioAPI, selector: string) {
  return $(selector).first().text().replace(/\s+/g, " ").trim();
}
export function firstAttr($: CheerioAPI, selector: string, attr: string) {
  return ($(selector).first().attr(attr) ?? "").trim();
}
