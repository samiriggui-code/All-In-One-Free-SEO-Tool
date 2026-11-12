/**
 * Pure-data CWV thresholds. Extracted from `crux.ts` so client components
 * can use them without dragging in the server-only DB-backed key fetcher.
 *
 * The one copy of Google's "good" and "needs improvement" limits for the
 * performance family: field data (CrUX tabs), lab measures (local-cwv.ts,
 * local-cwv-psi.ts) and the origin summary all read them from here.
 */

export type CwvKind = "lcp" | "inp" | "cls" | "fcp" | "ttfb";

/** Up to `good` is good, up to `ni` needs improvement, beyond is poor. */
export const CWV_THRESHOLDS: Record<CwvKind, { good: number; ni: number }> = {
  lcp: { good: 2500, ni: 4000 },
  inp: { good: 200, ni: 500 },
  cls: { good: 0.1, ni: 0.25 },
  fcp: { good: 1800, ni: 3000 },
  ttfb: { good: 800, ni: 1800 },
};

export function ratingForMetric(
  kind: CwvKind,
  p75: number,
): "good" | "needs_improvement" | "poor" {
  const { good, ni } = CWV_THRESHOLDS[kind];
  if (p75 <= good) return "good";
  if (p75 <= ni) return "needs_improvement";
  return "poor";
}

/** Verdict of a lab measure, as the local and PSI runs report it. */
export function labVerdict(
  kind: CwvKind,
  value: number | null,
): "good" | "needs-improvement" | "poor" | "unknown" {
  if (value === null || !Number.isFinite(value)) return "unknown";
  const { good, ni } = CWV_THRESHOLDS[kind];
  if (value <= good) return "good";
  if (value <= ni) return "needs-improvement";
  return "poor";
}

/** Badge colours for a field-data rating. */
export const CWV_RATING_TONE: Record<string, string> = {
  good: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  needs_improvement: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  poor: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};
