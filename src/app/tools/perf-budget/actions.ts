"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { getTranslations } from "next-intl/server";
import { scanCwv } from "@/lib/pagespeed";
import { fetchCruxData } from "@/lib/crux";
import { recordToolRun } from "@/lib/tool-findings";
import { perfBudgetFindings } from "@/lib/tool-finding-builders";

export type BudgetLine = {
  /** Message key under tools.ui.perf-budget.lines; label stays English for finding signatures. */
  key: string;
  label: string;
  budget: string;
  actual: string;
  passed: boolean;
};

export type BudgetState =
  | { ok: true; fails: number; lines: BudgetLine[] }
  | { ok: false; error: string }
  | null;

export async function runBudget(
  _prev: BudgetState,
  formData: FormData,
): Promise<BudgetState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.perf-budget");
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, error: t("errorRequired") };
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return { ok: false, error: t("errorInvalid") };
  }

  const num = (k: string) => Number(formData.get(k) ?? 0);
  const budgets = {
    htmlKb: num("htmlKb"),
    cssKb: num("cssKb"),
    jsKb: num("jsKb"),
    imageKb: num("imageKb"),
    fontKb: num("fontKb"),
    totalKb: num("totalKb"),
    requests: num("requests"),
    lcpMs: num("lcpMs"),
    inpMs: num("inpMs"),
    cls: num("cls"),
  };

  // Pull PageSpeed Insights for byte/request breakdown + lab metrics.
  const psi = await scanCwv({ url: parsed.toString() });
  if (!psi.ok) {
    return {
      ok: false,
      error:
        psi.error ??
        t("errorNoPsi"),
    };
  }

  const lines: BudgetLine[] = [];

  function add(
    key: string,
    label: string,
    actualNum: number,
    budgetNum: number,
    fmt: (n: number) => string,
    lowerIsBetter = true,
  ) {
    const passed = lowerIsBetter
      ? actualNum <= budgetNum
      : actualNum >= budgetNum;
    lines.push({
      key,
      label,
      budget: fmt(budgetNum),
      actual: fmt(actualNum),
      passed,
    });
  }

  const kb = (n: number) => `${Math.round(n)} KB`;
  const ms = (n: number) => `${Math.round(n)} ms`;

  if (psi.bytesByType) {
    if (budgets.htmlKb)
      add("html", "HTML bytes", (psi.bytesByType.document ?? 0) / 1024, budgets.htmlKb, kb);
    if (budgets.cssKb)
      add("css", "CSS bytes", (psi.bytesByType.stylesheet ?? 0) / 1024, budgets.cssKb, kb);
    if (budgets.jsKb)
      add("js", "JavaScript bytes", (psi.bytesByType.script ?? 0) / 1024, budgets.jsKb, kb);
    if (budgets.imageKb)
      add("image", "Image bytes", (psi.bytesByType.image ?? 0) / 1024, budgets.imageKb, kb);
    if (budgets.fontKb)
      add("font", "Font bytes", (psi.bytesByType.font ?? 0) / 1024, budgets.fontKb, kb);
  }

  if (budgets.totalKb && typeof psi.totalBytes === "number") {
    add("total", "Total bytes", psi.totalBytes / 1024, budgets.totalKb, kb);
  }
  if (budgets.requests && typeof psi.requestCount === "number") {
    add("requests", "Total requests", psi.requestCount, budgets.requests, (n) =>
      String(Math.round(n)),
    );
  }

  // Lab metrics from PSI
  if (budgets.lcpMs && typeof psi.lcpMs === "number") {
    add("lcp", "LCP (lab)", psi.lcpMs, budgets.lcpMs, ms);
  }
  if (budgets.cls && typeof psi.cls === "number") {
    // CLS in scanCwv is stored × 100 (percent-style). Normalize back to
    // the standard 0..1 scale for budget comparison.
    add("cls", "CLS (lab)", psi.cls / 100, budgets.cls, (n) => n.toFixed(3));
  }

  // INP isn't a lab metric — use CrUX field data
  if (budgets.inpMs) {
    try {
      const crux = await fetchCruxData({ url: parsed.toString() });
      const inp = crux.metrics?.inp?.p75;
      if (typeof inp === "number") {
        add("inp", "INP (CrUX field, p75)", inp, budgets.inpMs, ms);
      }
    } catch {
      // skip if CrUX unavailable
    }
  }

  if (lines.length === 0) {
    return {
      ok: false,
      error: t("errorNoSignals"),
    };
  }
  const fails = lines.filter((l) => !l.passed).length;
  const result: BudgetState = { ok: true, fails, lines };
  await recordToolRun({
    toolId: "perf-budget",
    label: `${parsed.toString()} · ${fails} fail${fails === 1 ? "" : "s"}`,
    input: { url: parsed.toString(), budgets },
    result,
    findings: perfBudgetFindings(lines),
  });
  return result;
}
