import { describe, expect, it } from "vitest";
import type { AuditResult, RuleResult } from "@/audit/types";
import { buildEngineReport, isEngineReport } from "./engine-report";

const r = (ruleId: string, status: RuleResult["status"], message: string, pageUrl?: string, weight = 1): RuleResult => ({
  ruleId,
  status,
  message,
  score: status === "pass" ? 100 : status === "warn" ? 50 : 0,
  weight,
  ...(pageUrl && { details: { pageUrl } }),
});

const result = {
  url: "https://ex.com/",
  overallScore: 72,
  timestamp: "2026-10-24T00:00:00.000Z",
  crawledPages: 2,
  coverage: { pages: ["https://ex.com/", "https://ex.com/a"], detail: "per-page" },
  categoryResults: [
    {
      categoryId: "core",
      score: 60,
      passCount: 2,
      warnCount: 1,
      failCount: 1,
      results: [
        r("core-title-present", "pass", "ok", "https://ex.com/"),
        r("core-title-present", "fail", "No title", "https://ex.com/a"),
        r("core-description-present", "warn", "Short", "https://ex.com/"),
        r("core-description-present", "pass", "ok", "https://ex.com/a"),
        r("core-canonical-present", "pass", "ok", "https://ex.com/"),
      ],
    },
    {
      categoryId: "perf",
      score: 100,
      passCount: 0,
      warnCount: 0,
      failCount: 0,
      results: [r("perf-lcp", "warn", "No reading", "https://ex.com/", 0)],
    },
  ],
} as unknown as AuditResult;

describe("buildEngineReport", () => {
  const report = buildEngineReport(result);

  it("gives each rule its worst reading across pages", () => {
    const core = report.categories[0];
    expect(core.issues.map((x) => [x.ruleId, x.status])).toEqual([
      ["core-title-present", "fail"],
      ["core-description-present", "warn"],
    ]);
    expect(core.quiet.map((x) => x.ruleId)).toEqual(["core-canonical-present"]);
    expect(core.issues[0].findings).toEqual([
      { message: "No title", status: "fail", pages: ["https://ex.com/a"], pageCount: 1 },
    ]);
  });

  it("counts a rule with no reading as not measured", () => {
    expect(report.categories[1].counts["not-measured"]).toBe(1);
    expect(report.totals).toEqual({ fail: 1, warn: 1, pass: 1, "not-measured": 1, total: 4 });
  });

  it("lists failures before warnings in the fix-first list", () => {
    expect(report.top.map((x) => x.ruleId)).toEqual(["core-title-present", "core-description-present"]);
    expect(report.top[0].fix.length).toBeGreaterThan(0);
  });

  it("recognises stored engine reports only", () => {
    expect(isEngineReport(result)).toBe(true);
    expect(isEngineReport({ summary: "x" })).toBe(false);
    expect(isEngineReport(null)).toBe(false);
  });
});
