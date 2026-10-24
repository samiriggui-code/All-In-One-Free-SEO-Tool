/**
 * One score, one verdict: the grade and label every surface prints beside a
 * score, so the dashboard, the Markdown export and the LLM export agree.
 */

export type VerdictToken = "pass" | "warn" | "orange" | "fail" | "neutral";
export type Verdict = { grade: string; label: string; colorToken: VerdictToken };

const BUCKETS: Array<{ min: number } & Verdict> = [
  { min: 90, grade: "A", label: "Excellent", colorToken: "pass" },
  { min: 80, grade: "B", label: "Good", colorToken: "pass" },
  { min: 70, grade: "C", label: "Fair", colorToken: "warn" },
  { min: 50, grade: "D", label: "Needs Work", colorToken: "orange" },
  { min: -Infinity, grade: "F", label: "Poor", colorToken: "fail" },
];
const NOT_SCORED: Verdict = { grade: "—", label: "Not scored", colorToken: "neutral" };

export function scoreToVerdict(score: number | null | undefined): Verdict {
  if (score === null || score === undefined || Number.isNaN(score)) return NOT_SCORED;
  for (const bucket of BUCKETS) {
    if (score >= bucket.min) {
      return { grade: bucket.grade, label: bucket.label, colorToken: bucket.colorToken };
    }
  }
  return NOT_SCORED;
}
