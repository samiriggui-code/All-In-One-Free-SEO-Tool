/**
 * Generates a real LLM-backed executive summary when an API key is set.
 * Falls back to template-based output otherwise.
 *
 * Uses the central `callAI` helper so it benefits from credit-saver mode
 * + the feedback-driven style learning automatically.
 *
 * Cite-or-bust pattern (Move #4): the function returns BOTH the prose
 * AND a deterministic list of `dataPoints` derived from the input.
 * Callers should render `dataPoints` alongside the prose as a "Data
 * behind this summary" footer / expand — so every claim in the
 * summary can be audited against the underlying numbers. Computing
 * citations from input (not asking the LLM) avoids:
 *   - free-tier providers that don't reliably return JSON
 *   - LLM hallucinating "I used number X" when it didn't
 *   - extra token spend
 */

import { callAIResult } from "./ai-call";
import type { AiFailure } from "./ai-error";
import type { Locale } from "@/i18n/config";
import { getReportLocale, reportFormat, reportStrings, type ReportStrings } from "./report-i18n";

export type ExecSummaryDataPoint = {
  /** Short label, e.g. "Health score", "Organic sessions (28d)". */
  label: string;
  /** Human-readable value, e.g. "78 / 100 (+5 vs last)". */
  value: string;
};

export type ExecSummaryResult = {
  /** The 50-90 word executive summary itself. */
  prose: string;
  /**
   * Every input data point that was non-null and therefore *could* have
   * influenced the prose. Render this somewhere visible — a callout,
   * a footer accordion, a "Data used" PDF section. Building reader
   * trust depends on it.
   */
  dataPoints: ExecSummaryDataPoint[];
  /** Whether the prose came from a real LLM call or the template fallback. */
  source: "ai" | "template";
  /**
   * Set when `source === "template"` because the AI call failed rather
   * than because no provider is wanted. The template fallback is good
   * — reports still generate — but silently swapping in a worse summary
   * with no explanation meant users never learned their AI key had
   * stopped working, and blamed the tool for flat prose.
   */
  aiFailure?: AiFailure | null;
};

export type ExecSummaryInput = {
  clientId?: number;
  clientName: string;
  clientUrl: string;
  score: number | null;
  prevScore: number | null;
  totalTasks: number;
  doneTasks: number;
  openTasks: number;
  topIssues: { type: string; severity: string; message: string }[];
  techStack: string[] | null;
  niche: string | null;
  /** Real GSC + GA4 numbers when the client has Google linked */
  organicSessions?: number | null;
  organicSessionsDeltaPct?: number | null;
  topQueries?: { query: string; clicks: number; position: number }[];
  quickWinsCount?: number;
  /** Language of the summary; defaults to the workspace language. */
  locale?: Locale;
};

const SYSTEM_PROMPT = `You write SEO executive summaries for monthly reports.

Strict rules:
- Use the formula: [Direction] + [Win] + [Priority]. Three concise sentences max.
- First sentence: the direction (improved / dropped / held / first measurement) with the score and delta if any.
- Second sentence: the biggest win or notable item this period (work completed, areas improved).
- Third sentence: next priority — what to focus on next, grounded in the data given.
- No marketing fluff. No "we are excited to". Direct, factual, professional.
- Plain language. Use "you/your" where natural.
- Total length: 50-90 words.`;

export async function generateExecSummary(
  input: ExecSummaryInput,
): Promise<ExecSummaryResult> {
  const locale = input.locale ?? (await getReportLocale());
  const S = reportStrings(locale).summary;
  const userPrompt = buildUserPrompt(input);
  const dataPoints = collectDataPoints(input, locale);

  const result = await callAIResult({
    // The prompt stays in English (models follow it best); the answer is
    // asked for in the report's language.
    system: `${SYSTEM_PROMPT}\n- ${S.aiLanguage}`,
    user: userPrompt,
    maxTokens: 500,
    temperature: 0.4,
    timeoutMs: 25_000,
    feature: "exec_summary",
    clientId: input.clientId ?? null,
    ignoreCreditSaver: true,
  });

  if (result.ok && result.text.trim().length > 0) {
    return { prose: result.text.trim(), dataPoints, source: "ai" };
  }
  return {
    prose: templateSummary(input, reportStrings(locale)),
    dataPoints,
    source: "template",
    // "No provider configured" is a deliberate choice, not a fault —
    // don't nag a user who never wanted AI in the first place.
    aiFailure:
      !result.ok && result.failure.reason !== "no_provider"
        ? result.failure
        : null,
  };
}

/**
 * Deterministic citation builder. Walks every input field and emits a
 * line for each non-null piece of evidence. The same input always
 * produces the same dataPoints list — no model in the loop.
 */
function collectDataPoints(input: ExecSummaryInput, locale: Locale): ExecSummaryDataPoint[] {
  const S = reportStrings(locale).summary;
  const F = reportFormat(locale);
  const sev = (x: string) => S.severity[x] ?? x;
  const out: ExecSummaryDataPoint[] = [];

  if (input.score !== null) {
    if (input.prevScore !== null) {
      const delta = input.score - input.prevScore;
      out.push({
        label: S.dpHealth,
        value: S.dpHealthDelta(input.score, F.signed(delta), input.prevScore),
      });
    } else {
      out.push({ label: S.dpHealth, value: S.dpHealthFirst(input.score) });
    }
  }

  out.push({
    label: S.dpTasks,
    value: S.dpTasksValue(input.doneTasks, input.openTasks, input.totalTasks),
  });

  if (input.topIssues.length > 0) {
    const top = input.topIssues[0];
    out.push({
      label: S.dpTopIssue(sev(top.severity)),
      value: `${top.type} - ${top.message}`,
    });
    if (input.topIssues.length > 1) {
      // Distinct names: several findings of one rule used to read
      // "rule-a, rule-a, rule-a".
      const names = [...new Set(input.topIssues.slice(1).map((i) => i.type))];
      out.push({
        label: S.dpOtherIssues,
        value: S.dpOtherIssuesValue(
          input.topIssues.length - 1,
          `${names.slice(0, 3).join(", ")}${names.length > 3 ? ", ..." : ""}`,
        ),
      });
    }
  }

  if (typeof input.organicSessions === "number") {
    const trend =
      typeof input.organicSessionsDeltaPct === "number"
        ? S.dpSessionsTrend(F.pct(input.organicSessionsDeltaPct))
        : "";
    out.push({ label: S.dpSessions, value: `${F.num(input.organicSessions)}${trend}` });
  }

  if (input.topQueries && input.topQueries.length > 0) {
    const q = input.topQueries[0];
    out.push({
      label: S.dpTopQuery,
      value: S.dpTopQueryValue(q.query, q.clicks, F.dec(q.position)),
    });
  }

  if (typeof input.quickWinsCount === "number" && input.quickWinsCount > 0) {
    out.push({ label: S.dpQuickWins, value: String(input.quickWinsCount) });
  }

  if (input.techStack && input.techStack.length > 0) {
    out.push({ label: S.dpTech, value: input.techStack.join(", ") });
  }

  if (input.niche) {
    out.push({ label: S.dpNiche, value: input.niche });
  }

  return out;
}

function buildUserPrompt(input: ExecSummaryInput): string {
  const lines: string[] = [];
  lines.push(`Client: ${input.clientName} (${input.clientUrl})`);
  if (input.niche) lines.push(`Niche: ${input.niche}`);
  if (input.techStack?.length)
    lines.push(`Tech stack: ${input.techStack.join(", ")}`);

  if (input.score !== null && input.prevScore !== null) {
    const delta = input.score - input.prevScore;
    lines.push(
      `Health score: ${input.score}/100 (${delta > 0 ? "+" : ""}${delta} vs last audit, was ${input.prevScore})`,
    );
  } else if (input.score !== null) {
    lines.push(`Health score: ${input.score}/100 (first measurement)`);
  } else {
    lines.push("Health score: not yet measured");
  }

  lines.push(
    `Tasks: ${input.doneTasks} done / ${input.openTasks} open / ${input.totalTasks} total`,
  );

  if (input.topIssues.length > 0) {
    lines.push("Top issues to address:");
    for (const i of input.topIssues.slice(0, 5)) {
      lines.push(`- [${i.severity}] ${i.type}: ${i.message}`);
    }
  } else {
    lines.push("Top issues: none significant.");
  }

  if (typeof input.organicSessions === "number") {
    const trend =
      typeof input.organicSessionsDeltaPct === "number"
        ? ` (${input.organicSessionsDeltaPct > 0 ? "+" : ""}${input.organicSessionsDeltaPct}% vs prior period)`
        : "";
    lines.push(
      `Organic sessions (last 28 days): ${input.organicSessions.toLocaleString()}${trend}`,
    );
  }
  if (input.topQueries?.length) {
    lines.push("Top organic queries:");
    for (const q of input.topQueries.slice(0, 5)) {
      lines.push(
        `- "${q.query}" — ${q.clicks} clicks at position ${q.position.toFixed(1)}`,
      );
    }
  }
  if (typeof input.quickWinsCount === "number" && input.quickWinsCount > 0) {
    lines.push(
      `Quick-win keywords (positions 4-15 with traffic): ${input.quickWinsCount}`,
    );
  }

  lines.push("");
  lines.push("Write the executive summary now.");
  return lines.join("\n");
}

/**
 * Template-based fallback when no API key is configured.
 * Same formula CLAUDE.md spec'd: [Direction] + [Win] + [Priority].
 */
function templateSummary(input: ExecSummaryInput, L: ReportStrings): string {
  const S = L.summary;
  const c = input.clientName;
  const parts: string[] = [];

  if (input.score !== null && input.prevScore !== null) {
    const delta = input.score - input.prevScore;
    if (Math.abs(delta) < 2) parts.push(S.steady(c, input.score));
    else if (delta > 0) parts.push(S.up(c, delta, input.score));
    else parts.push(S.down(c, Math.abs(delta), input.score));
  } else if (input.score !== null) {
    parts.push(S.baseline(c, input.score));
  } else {
    parts.push(S.none(c));
  }

  if (input.doneTasks > 0) parts.push(S.closed(input.doneTasks, input.totalTasks));
  else if (input.totalTasks > 0) parts.push(S.queued(input.totalTasks));

  const top = input.topIssues[0];
  if (top) {
    // The rule name, not its message: the message is engine output, in
    // English, and often a whole sentence with URLs in it.
    parts.push(S.next(top.type));
  }

  return parts.join(" ");
}
