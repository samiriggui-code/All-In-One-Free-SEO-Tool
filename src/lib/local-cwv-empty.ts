import type { CwvResult } from "./local-cwv";

/**
 * A Core Web Vitals result with nothing measured, for when the browser
 * run or the PageSpeed Insights call could not happen. Shared by the
 * two ways of measuring (local-cwv.ts, local-cwv-psi.ts).
 *
 * Kept out of local-cwv.ts so the PSI path does not load the browser pool.
 */
export function emptyCwvResult(url: string, measuredAt: string, error?: string): CwvResult {
  return {
    ok: false,
    url,
    finalUrl: null,
    lcpMs: null,
    lcpElement: null,
    fcpMs: null,
    cls: null,
    ttfbMs: null,
    domContentLoadedMs: null,
    loadMs: null,
    tbtMs: null,
    performanceScore: null,
    verdict: { lcp: "unknown", cls: "unknown", fcp: "unknown" },
    resources: { total: 0, bytes: 0, count: 0, byType: {} },
    consoleErrors: 0,
    consoleWarnings: 0,
    networkErrors: [],
    measuredAt,
    fixes: [],
    ...(error === undefined ? {} : { error }),
  };
}
