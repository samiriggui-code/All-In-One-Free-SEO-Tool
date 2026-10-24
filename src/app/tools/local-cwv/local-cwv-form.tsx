"use client";

import { useActionState } from "react";
import { usePresetMode, usePresetUrl } from "@/components/use-preset-url";
import { SetupPrompt } from "@/components/setup-prompt";
import { Gauge, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { runLocalCwv, type LocalCwvState } from "./actions";

export function LocalCwvForm() {
  const t = useTranslations("tools.ui.local-cwv");
  const tCommon = useTranslations("tools.common");
  // Prefilled when opened from a client, so the domain is not retyped.
  const presetUrl = usePresetUrl();
  // Honours ?mode=local, which the "measure locally instead" link sets.
  const presetMode = usePresetMode(["psi", "local"] as const, "psi");
  const [state, formAction, pending] = useActionState<
    LocalCwvState | null,
    FormData
  >(runLocalCwv, null);

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_130px_180px_120px]">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{tCommon("urlLabel")}</span>
            <input
              name="url"
              defaultValue={presetUrl}
              required
              placeholder="https://example.com/landing"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("device")}</span>
            <select
              name="device"
              defaultValue="mobile"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="mobile">{t("deviceMobile")}</option>
              <option value="desktop">{t("deviceDesktop")}</option>
            </select>
          </label>
          <label
            className="space-y-1 text-xs"
            title={t("modeHelp")}
          >
            <span className="text-muted-foreground">{t("mode")}</span>
            <select
              name="mode"
              key={presetMode}
              defaultValue={presetMode}
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {/* Named for what it does rather than which API it calls.
                  "PSI API" told the reader nothing about the fact that
                  it needs a key they were never asked for. */}
              <option value="psi">{t("modePsi")}</option>
              <option value="local">{t("modeLocal")}</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-amber-500/15 px-4 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                {t("running")}
              </>
            ) : (
              <>
                <Gauge className="mr-2 size-3" />
                {tCommon("run")}
              </>
            )}
          </button>
        </div>
      </form>

      {state &&
        !state.ok &&
        // A failure with a known fix gets the button. This used to print
        // 200 characters of Google's raw JSON into a red box, quota
        // metric names and project numbers and all.
        (state.failure?.fixHref ? (
          <SetupPrompt
            title={t("couldNotRun")}
            detail={state.error}
            href={state.failure.fixHref}
            cta={state.failure.fixLabel ?? t("fixThis")}
            secondary={{
              label: t("measureLocally"),
              href: "?mode=local",
            }}
          />
        ) : (
          <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
            {state.error}
          </p>
        ))}

      {state?.ok && <ResultView result={state.result} />}
    </>
  );
}

function ResultView({
  result,
}: {
  result: NonNullable<Extract<LocalCwvState, { ok: true }>["result"]>;
}) {
  const t = useTranslations("tools.ui.local-cwv");
  const verdictLabel = (v: string) =>
    t.has(`verdict.${v}`) ? t(`verdict.${v}`) : v;
  const score = result.performanceScore;
  const scoreTone =
    score === null
      ? "text-muted-foreground"
      : score >= 90
        ? "text-emerald-300"
        : score >= 50
          ? "text-amber-300"
          : "text-rose-300";

  const verdictTone: Record<string, string> = {
    good: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    "needs-improvement": "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    poor: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    unknown: "bg-white/5 text-muted-foreground ring-white/10",
  };

  return (
    <>
      {/* Which way this was actually measured.
          PSI reads real-user field data where Google has it; the local
          browser is one synthetic run on this machine. They are not
          interchangeable numbers, so a silent fallback would have handed
          the reader a different measurement under the old label — a
          quieter version of the bug this whole change is about. */}
      {result.fellBackBecause && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-500/25 dark:text-amber-200">
          <strong className="font-medium">{t("fellBackTitle")}</strong>{" "}
          {result.fellBackBecause} {t("fellBackNote")}
        </p>
      )}

      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{t("scoreTitle")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("scoreWeights")}
            </p>
          </div>
          <div className={`text-5xl font-bold tabular-nums ${scoreTone}`}>
            {score ?? "—"}
            <span className="text-base text-muted-foreground/60">/100</span>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full ${
              score === null
                ? "bg-white/5"
                : score >= 90
                  ? "bg-emerald-400/70"
                  : score >= 50
                    ? "bg-amber-400/70"
                    : "bg-rose-400/70"
            }`}
            style={{ width: `${score ?? 0}%` }}
          />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Metric
          label="LCP"
          value={result.lcpMs !== null ? `${(result.lcpMs / 1000).toFixed(2)}s` : "—"}
          target="≤2.5s"
          verdictTone={verdictTone[result.verdict.lcp]}
          verdictLabel={verdictLabel(result.verdict.lcp)}
          extra={result.lcpElement ? `<${result.lcpElement}>` : null}
        />
        <Metric
          label="FCP"
          value={result.fcpMs !== null ? `${(result.fcpMs / 1000).toFixed(2)}s` : "—"}
          target="≤1.8s"
          verdictTone={verdictTone[result.verdict.fcp]}
          verdictLabel={verdictLabel(result.verdict.fcp)}
        />
        <Metric
          label="CLS"
          value={result.cls !== null ? result.cls.toFixed(3) : "—"}
          target="≤0.1"
          verdictTone={verdictTone[result.verdict.cls]}
          verdictLabel={verdictLabel(result.verdict.cls)}
        />
        <Metric
          label="TBT"
          value={result.tbtMs !== null ? `${result.tbtMs}ms` : "—"}
          target="≤200ms"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="TTFB"
          value={result.ttfbMs !== null ? `${result.ttfbMs}ms` : "—"}
          target="≤600ms"
        />
        <Metric
          label="DCL"
          value={
            result.domContentLoadedMs !== null
              ? `${(result.domContentLoadedMs / 1000).toFixed(2)}s`
              : "—"
          }
          target=""
        />
        <Metric
          label={t("load")}
          value={result.loadMs !== null ? `${(result.loadMs / 1000).toFixed(2)}s` : "—"}
          target=""
        />
      </div>

      {Object.keys(result.resources.byType).length > 0 && (
        <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">
            {t("resourcesTitle", {
              count: result.resources.count,
              kb: (result.resources.bytes / 1024).toFixed(0),
            })}
          </h3>
          <div className="grid gap-2 text-xs sm:grid-cols-2 md:grid-cols-4">
            {Object.entries(result.resources.byType)
              .sort((a, b) => b[1].bytes - a[1].bytes)
              .map(([kind, v]) => (
                <div
                  key={kind}
                  className="rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-inset ring-white/5"
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {kind}
                  </div>
                  <div className="mt-0.5 text-sm font-medium">
                    {(v.bytes / 1024).toFixed(0)} KB
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t("requests", { count: v.count })}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {result.fixes.length > 0 && (
        <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-semibold">{t("topFixes")}</h3>
          <ul className="space-y-1.5 text-sm">
            {result.fixes.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(result.consoleErrors > 0 || result.networkErrors.length > 0) && (
        <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-semibold">{t("runtimeIssues")}</h3>
          {result.consoleErrors > 0 && (
            <p className="text-xs text-rose-300">
              {t("consoleErrors", { count: result.consoleErrors })}
            </p>
          )}
          {result.networkErrors.length > 0 && (
            <ul className="space-y-1 text-xs">
              {result.networkErrors.slice(0, 8).map((e, i) => (
                <li key={i} className="text-rose-300/90">
                  ✗ {e.url.slice(0, 100)} — {e.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

function Metric({
  label,
  value,
  target,
  verdictTone,
  verdictLabel,
  extra,
}: {
  label: string;
  value: string;
  target: string;
  verdictTone?: string;
  verdictLabel?: string;
  extra?: string | null;
}) {
  const t = useTranslations("tools.ui.local-cwv");
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {verdictLabel && verdictTone && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ring-1 ring-inset ${verdictTone}`}
          >
            {verdictLabel}
          </span>
        )}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {target && (
        <div className="text-[10px] text-muted-foreground">
          {t("target", { target })}
        </div>
      )}
      {extra && (
        <div className="text-[10px] text-muted-foreground/80">{extra}</div>
      )}
    </div>
  );
}
