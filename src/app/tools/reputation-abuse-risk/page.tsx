"use client";

import { useActionState } from "react";
import { useRunRefreshKey } from "@/components/use-run-refresh-key";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { scanForRisk, type ScanState } from "./actions";
import { RecentRuns } from "@/components/recent-runs";

const RISK_TONE: Record<"low" | "medium" | "high", string> = {
  low: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  high: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export default function ReputationAbuseRiskPage() {
  const t = useTranslations("tools.ui.reputation-abuse-risk");
  const tCommon = useTranslations("tools.common");
  const [state, formAction, pending] = useActionState<ScanState, FormData>(
    scanForRisk,
    null,
  );
  const refreshKey = useRunRefreshKey(state?.ok ? state : null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {tCommon("allTools")}
      </Link>

      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={ShieldAlert}
        accent="rose"
      />

      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl space-y-3 p-5"
      >
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("siteUrl")}</span>
          <input
            name="url"
            required
            placeholder="https://yoursite.com"
            className="h-10 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-rose-500/15 px-5 text-sm font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("scanning")}
            </>
          ) : (
            <>
              <ShieldAlert className="mr-2 size-4" />
              {t("run")}
            </>
          )}
        </button>
        <p className="text-[11px] text-muted-foreground">
          {t.rich("hint", { code: (chunks) => <code>{chunks}</code> })}
        </p>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <>
          <div
            className={`rounded-2xl border p-5 ${
              state.report.overall === "high"
                ? "border-rose-500/30 bg-rose-500/5"
                : state.report.overall === "medium"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-emerald-500/30 bg-emerald-500/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {t("overallFor", { domain: state.report.domain })}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${RISK_TONE[state.report.overall]}`}
              >
                {t(`risk.${state.report.overall}`).toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-sm">{state.report.summary}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("crawled", {
                pages: state.report.pagesScanned,
                sections: state.report.sections.length,
              })}
            </p>
          </div>

          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-3">
              <h3 className="text-sm font-semibold">{t("breakdown")}</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t("breakdownHint")}
              </p>
            </header>
            <ul className="divide-y divide-white/[0.06]">
              {state.report.sections.map((s) => (
                <li key={s.path} className="space-y-2 px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[12px]">
                      {s.path}
                    </code>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${RISK_TONE[s.risk]}`}
                    >
                      {t(`risk.${s.risk}`)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {t("sectionMeta", {
                        pages: s.pageCount,
                        overlap: Math.round(s.overlap * 100),
                      })}
                    </span>
                  </div>
                  {s.topicSignature.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {s.topicSignature.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-md bg-white/5 px-1.5 py-0.5 text-muted-foreground ring-1 ring-inset ring-white/10"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                  {s.explanation && (
                    <p className="rounded-md border border-white/5 bg-black/20 p-3 text-xs">
                      {s.explanation}
                    </p>
                  )}
                  {s.samples.length > 0 && (
                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                      <p className="font-medium text-foreground/80">
                        {t("samples")}
                      </p>
                      {s.samples.map((u) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 truncate hover:text-foreground hover:underline"
                        >
                          {u.replace(/^https?:\/\/[^/]+/, "")}
                          <ExternalLink className="size-2.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/5 bg-card/40 p-5 text-xs">
            <h3 className="font-semibold text-foreground/90">
              {t("fixTitle")}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                {t.rich("fix1", { strong: (chunks) => <strong>{chunks}</strong> })}
              </li>
              <li>
                {t.rich("fix2", { strong: (chunks) => <strong>{chunks}</strong> })}
              </li>
              <li>{t("fix3")}</li>
              <li>{t("fix4")}</li>
            </ul>
          </section>
        </>
      )}
      <RecentRuns toolId="reputation-abuse-risk" refreshKey={refreshKey} />
    </div>
  );
}
