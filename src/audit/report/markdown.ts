import { getFixSuggestion } from "@/audit/engine/fix-suggestions";
import { getCategoryById } from "@/audit/engine/categories";
import type { AuditResult } from "@/audit/types";
import { collectFindings, type Finding } from "@/audit/report/findings";
import { scoreToVerdict } from "@/audit/report/verdict";

function scoreEmoji(score: number): string {
  if (score >= 90) return ":white_check_mark:";
  if (score >= 70) return ":yellow_circle:";
  if (score >= 50) return ":orange_circle:";
  return ":red_circle:";
}

export function escapeMarkdown(text: string | null | undefined): string {
  if (text == null) return "";
  return text.replace(/[|\\`*_{}[\]()#+\-.!]/g, "\\$&");
}

function pageAttribution(finding: Finding): string {
  if (finding.pageCount <= 1 && finding.pages.length <= 1) {
    return finding.pages.length === 1 ? `- **Page:** ${escapeMarkdown(finding.pages[0])}` : "";
  }
  const shown = finding.pages.slice(0, 3).map((p) => escapeMarkdown(p));
  const rest = finding.pages.length - shown.length;
  const where = shown.length
    ? `${shown.join(", ")}${rest > 0 ? ` and ${rest} more` : ""}`
    : "across the crawl";
  const scope =
    finding.measuredPages > 0
      ? `${finding.pageCount} of ${finding.measuredPages} pages`
      : `${finding.pageCount} pages`;
  return `- **Affects:** ${scope} — ${where}`;
}

function findingSection(lines: string[], f: Finding, label: string, icon: string, fix: (ruleId: string) => string) {
  lines.push(`### ${escapeMarkdown(f.ruleId)}`);
  lines.push("");
  lines.push(`- **Category:** ${escapeMarkdown(f.categoryName)}`);
  lines.push(`- **Status:** ${icon} ${label}`);
  lines.push(`- **Message:** ${escapeMarkdown(f.message)}`);
  lines.push(`- **Fix:** ${escapeMarkdown(fix(f.ruleId))}`);
  const where = pageAttribution(f);
  if (where) lines.push(where);
  const details = Object.entries(f.details ?? {}).filter(([key]) => key !== "pageUrl");
  if (details.length > 0) {
    lines.push("- **Details:**");
    for (const [key, value] of details) {
      const display = typeof value === "object" ? JSON.stringify(value) : String(value);
      const truncated = display.length > 100 ? `${display.substring(0, 97)}...` : display;
      lines.push(`  - ${escapeMarkdown(key)}: \`${escapeMarkdown(truncated)}\``);
    }
  }
  lines.push("");
}

/** The audit as a Markdown document: score, caps, category table, then every finding worst-first. */
export function renderMarkdownReport(result: AuditResult, fix: (ruleId: string) => string = getFixSuggestion): string {
  const lines: string[] = [];
  lines.push("# SEO Audit Report");
  lines.push("");
  lines.push(`**URL:** [${result.url}](${result.url})`);
  lines.push(`**Date:** ${new Date(result.timestamp).toISOString().replace("T", " ").slice(0, 16)} UTC`);
  if (result.crawledPages > 1) lines.push(`**Pages Audited:** ${result.crawledPages}`);
  lines.push("");
  lines.push("## Overall Score");
  lines.push("");
  lines.push("| Score | Rating |");
  lines.push("|-------|--------|");
  lines.push(
    `| **${result.overallScore}/100** ${scoreEmoji(result.overallScore)} | ${scoreToVerdict(result.overallScore).label} |`,
  );
  lines.push("");
  if (result.scoreCap) {
    lines.push(`Capped from **${result.scoreCap.uncappedScore}**, the category average:`);
    lines.push("");
    for (const cap of result.scoreCap.caps) lines.push(`- ${cap.reason}`);
    lines.push("");
  }
  if (result.waivedCaps) {
    lines.push("Waived for staging, would cap the score in production:");
    lines.push("");
    for (const cap of result.waivedCaps) lines.push(`- ${cap.reason} (cap ${cap.ceiling})`);
    lines.push("");
  }
  lines.push("## Category Breakdown");
  lines.push("");
  const anyNotMeasured = result.categoryResults.some((c) => (c.notMeasuredCount ?? 0) > 0);
  if (anyNotMeasured) {
    lines.push("| Category | Score | Passed | Warnings | Failed | Not measured |");
    lines.push("|----------|-------|--------|----------|--------|--------------|");
  } else {
    lines.push("| Category | Score | Passed | Warnings | Failed |");
    lines.push("|----------|-------|--------|----------|--------|");
  }
  for (const c of result.categoryResults) {
    const name = getCategoryById(c.categoryId)?.name ?? c.categoryId;
    const row = `| ${escapeMarkdown(name)} | ${c.score} ${scoreEmoji(c.score)} | ${c.passCount} | ${c.warnCount} | ${c.failCount} |`;
    lines.push(anyNotMeasured ? `${row} ${c.notMeasuredCount ?? 0} |` : row);
  }
  lines.push("");
  const findings = collectFindings(result);
  const failures = findings.filter((f) => f.status === "fail");
  const warnings = findings.filter((f) => f.status === "warn");
  if (failures.length > 0) {
    lines.push("## :x: Failures");
    lines.push("");
    lines.push(`Found ${failures.length} failing ${failures.length === 1 ? "check" : "checks"}, most important first:`);
    lines.push("");
    for (const f of failures) findingSection(lines, f, "Failed", ":x:", fix);
  }
  if (warnings.length > 0) {
    lines.push("## :warning: Warnings");
    lines.push("");
    lines.push(`Found ${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}, most important first:`);
    lines.push("");
    for (const f of warnings) findingSection(lines, f, "Warning", ":warning:", fix);
  }
  const totalPassed = result.categoryResults.reduce((sum, c) => sum + c.passCount, 0);
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Total Checks | ${totalPassed + warnings.length + failures.length} |`);
  lines.push(`| :white_check_mark: Passed | ${totalPassed} |`);
  lines.push(`| :warning: Warnings | ${warnings.length} |`);
  lines.push(`| :x: Failures | ${failures.length} |`);
  lines.push("");
  return lines.join("\n");
}
