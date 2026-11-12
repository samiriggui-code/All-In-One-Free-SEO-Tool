"use client";

import { ToolBackLink } from "@/components/tools/tool-back-link";
import { useActionState } from "react";
import { useRunRefreshKey } from "@/components/use-run-refresh-key";
import { Gauge, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import {
  runOriginSummary,
  type OriginSummaryState,
} from "../crux/actions";
import { RecentRuns } from "@/components/recent-runs";
import { CWV_THRESHOLDS, ratingForMetric } from "@/lib/crux-thresholds";

const THRESH: Record<string, { good: number; ni: number; unit: string }> = Object.fromEntries(
  Object.entries(CWV_THRESHOLDS).map(([k, v]) => [k, { ...v, unit: k === "cls" ? "" : "ms" }]),
);

const RATING_TEXT = {
  good: "text-emerald-300",
  needs_improvement: "text-amber-300",
  poor: "text-rose-300",
} as const;

const METRIC_LABEL: Record<string, string> = {
  lcp: "LCP",
  inp: "INP",
  cls: "CLS",
  fcp: "FCP",
  ttfb: "TTFB",
};

export default function CruxOriginSummaryPage() {
  const t = useTranslations("tools.ui.crux-origin");
  const [state, formAction, pending] = useActionState<
    OriginSummaryState,
    FormData
  >(runOriginSummary, null);
  const refreshKey = useRunRefreshKey(state?.ok ? state : null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ToolBackLink />

      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Gauge}
        accent="cyan"
      />

      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl space-y-3 p-5"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_140px_120px]">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("urlLabel")}</span>
            <input
              name="url"
              required
              placeholder="https://yoursite.com/page"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("formFactor")}</span>
            <select
              name="formFactor"
              defaultValue="PHONE"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
            >
              <option value="PHONE">{t("phone")}</option>
              <option value="DESKTOP">{t("desktop")}</option>
              <option value="ALL_FORM_FACTORS">{t("allFormFactors")}</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-cyan-500/15 px-4 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : t("compare")}
          </button>
        </div>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <ScopeCard label={t("urlScope")} data={state.urlScope} />
            <ScopeCard
              label={t("originScope")}
              data={state.originScope}
              highlight
            />
          </div>

          {state.gap.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl">
              <header className="border-b border-white/[0.06] px-5 py-3">
                <h2 className="text-sm font-semibold">{t("gapTitle")}</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("gapHint")}
                </p>
              </header>
              <ul className="divide-y divide-white/[0.06]">
                {state.gap.map((g) => {
                  const th = THRESH[g.metric];
                  if (!th) return null;
                  const fmt = (n: number) =>
                    g.metric === "cls" ? n.toFixed(3) : `${Math.round(n)}${th.unit}`;
                  const concerning = g.delta > 0 && g.originP75 > th.good;
                  return (
                    <li
                      key={g.metric}
                      className="flex items-center gap-3 px-5 py-3 text-sm"
                    >
                      <span className="w-12 font-mono text-[11px] text-muted-foreground">
                        {METRIC_LABEL[g.metric]}
                      </span>
                      <span className="text-foreground/90">
                        {t("gapUrl", { value: fmt(g.urlP75) })}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span
                        className={
                          concerning ? "text-rose-300" : "text-foreground/90"
                        }
                      >
                        {t("gapOrigin", { value: fmt(g.originP75) })}
                      </span>
                      <span
                        className={`ml-auto text-[11px] ${
                          g.delta > 0 ? "text-rose-300" : "text-emerald-300"
                        }`}
                      >
                        {g.delta > 0 ? "+" : ""}
                        {fmt(g.delta)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
      <RecentRuns toolId="crux-origin" refreshKey={refreshKey} />
    </div>
  );
}

type OkOriginState = Extract<NonNullable<OriginSummaryState>, { ok: true }>;

function ScopeCard({
  label,
  data,
  highlight,
}: {
  label: string;
  data: OkOriginState["urlScope"];
  highlight?: boolean;
}) {
  const tr = useTranslations("tools.ui.crux-origin");
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-violet-500/30 bg-violet-500/5"
          : "border-white/5 bg-card/40"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {!data.hasData ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {data.error ?? tr("noData")}
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-xs">
          {(["lcp", "inp", "cls", "fcp", "ttfb"] as const).map((m) => {
            const t = THRESH[m];
            const v = data.metrics[m]?.p75;
            if (typeof v !== "number") return null;
            const tone = RATING_TEXT[ratingForMetric(m, v)];
            return (
              <li
                key={m}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-muted-foreground">{METRIC_LABEL[m]}</span>
                <span className={`font-medium tabular-nums ${tone}`}>
                  {m === "cls" ? v.toFixed(3) : `${Math.round(v)}${t.unit}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {data.collectionPeriod && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {data.collectionPeriod.start} → {data.collectionPeriod.end}
        </p>
      )}
    </div>
  );
}
