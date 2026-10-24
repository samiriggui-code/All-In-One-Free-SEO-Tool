"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, AlertTriangle, CircleCheck, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { runFreshnessAudit } from "./actions";
import type { FreshnessAudit, FreshnessSignal } from "@/lib/freshness-check";

const SOURCE_KEY: Record<FreshnessSignal["source"], string> = {
  "http-header": "httpHeader",
  "meta-tag": "metaTag",
  "json-ld": "jsonLd",
  "time-element": "timeElement",
  "visible-text": "visibleText",
  sitemap: "sitemap",
};

export function FreshnessForm() {
  const t = useTranslations("tools.ui.freshness");
  const [url, setUrl] = useState("");
  const [sitemap, setSitemap] = useState("");
  const [result, setResult] = useState<FreshnessAudit | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setResult(null);
    setCopied(false);
    startTransition(async () => {
      const r = await runFreshnessAudit(url.trim(), sitemap.trim() || undefined);
      setResult(r);
    });
  }

  function copyPatch() {
    if (!result?.ok || !result.suggestedPatch) return;
    navigator.clipboard.writeText(result.suggestedPatch).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/your-blog-post"
          className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <details className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
          <summary className="cursor-pointer text-[11px] text-muted-foreground">
            {t("sitemapOptional")}
          </summary>
          <input
            type="url"
            value={sitemap}
            onChange={(e) => setSitemap(e.target.value)}
            placeholder="https://example.com/sitemap.xml"
            className="mt-2 w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </details>
        <button
          type="submit"
          disabled={pending || !url.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-500/15 px-5 text-sm font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("running")}
            </>
          ) : (
            t("submit")
          )}
        </button>
      </form>

      {result && !result.ok && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
          <div className="font-semibold">{t("errorTitle")}</div>
          <p className="mt-1 text-rose-200/80">{result.error}</p>
        </div>
      )}

      {result && result.ok && (
        <>
          {/* Verdict banner */}
          <VerdictBanner
            verdict={result.verdict}
            score={result.score}
            ageDays={result.newestAgeDays}
          />

          {/* Signals table */}
          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-3">
              <h2 className="text-base font-semibold">{t("signalsTitle")}</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {result.newestAgeDays == null
                  ? t("signalsSummaryUndated", { count: result.signals.length })
                  : t("signalsSummary", {
                      count: result.signals.length,
                      days: result.newestAgeDays,
                    })}
              </p>
            </header>
            {result.signals.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                {t.rich("noSignals", {
                  code: (chunks) => <code>{chunks}</code>,
                })}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 text-left font-medium">{t("cols.source")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("cols.field")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("cols.value")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("cols.age")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {result.signals.map((s, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-xs">
                        <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {t(`sources.${SOURCE_KEY[s.source]}`)}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px]">
                        {s.label}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-muted-foreground">
                        {s.value.length > 60
                          ? s.value.slice(0, 60) + "…"
                          : s.value}
                      </td>
                      <td className="px-3 py-3 text-right text-[11px] tabular-nums">
                        {s.ageDays == null ? (
                          <span className="text-rose-300">{t("unparseable")}</span>
                        ) : s.ageDays <= 30 ? (
                          <span className="text-emerald-300">{t("days", { days: s.ageDays })}</span>
                        ) : s.ageDays <= 365 ? (
                          <span className="text-amber-300">{t("days", { days: s.ageDays })}</span>
                        ) : (
                          <span className="text-rose-300">{t("days", { days: s.ageDays })}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
              <header className="mb-3 flex items-center gap-2 text-amber-200">
                <AlertTriangle className="size-4" />
                <h3 className="text-sm font-semibold">
                  {t("toFix", { count: result.warnings.length })}
                </h3>
              </header>
              <ul className="space-y-2 text-[12px] text-amber-100/90">
                {result.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 text-amber-400">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Suggested patch */}
          <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
            <header className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{t("patchTitle")}</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t.rich("patchHelp", {
                    code: (chunks) => <code>{chunks}</code>,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={copyPatch}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-medium hover:bg-white/[0.08]"
              >
                <Copy className="size-3.5" />
                {copied ? t("copied") : t("copyPatch")}
              </button>
            </header>
            <pre className="overflow-x-auto rounded-lg border border-white/[0.06] bg-black/40 p-4 text-[11px] leading-relaxed">
              {result.suggestedPatch}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}

function VerdictBanner({
  verdict,
  score,
  ageDays,
}: {
  verdict: "fresh" | "aging" | "stale" | "unknown";
  score: number;
  ageDays: number | null;
}) {
  const t = useTranslations("tools.ui.freshness.verdict");
  const meta = {
    fresh: {
      icon: <CircleCheck className="size-5" />,
      tone: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
      dot: "bg-emerald-400",
      headline: t("fresh.headline"),
      body: t("fresh.body"),
    },
    aging: {
      icon: <Info className="size-5" />,
      tone: "border-amber-500/30 bg-amber-500/5 text-amber-200",
      dot: "bg-amber-400",
      headline: t("aging.headline"),
      body: t("aging.body"),
    },
    stale: {
      icon: <AlertTriangle className="size-5" />,
      tone: "border-rose-500/30 bg-rose-500/5 text-rose-200",
      dot: "bg-rose-400",
      headline: t("stale.headline"),
      body: t("stale.body"),
    },
    unknown: {
      icon: <AlertTriangle className="size-5" />,
      tone: "border-rose-500/30 bg-rose-500/5 text-rose-200",
      dot: "bg-rose-400",
      headline: t("unknown.headline"),
      body: t("unknown.body"),
    },
  }[verdict];

  return (
    <section
      className={`flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${meta.tone}`}
    >
      <div className="flex items-center gap-2">
        {meta.icon}
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span>{meta.headline}</span>
            <span className={`inline-block size-2 rounded-full ${meta.dot}`} />
            <span className="text-sm font-normal opacity-80">
              {t("score", { score })}
            </span>
          </div>
          <p className="text-[12px] opacity-80">{meta.body}</p>
        </div>
      </div>
      {ageDays != null && (
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-wider opacity-70">
            {t("newest")}
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {ageDays === 0 ? t("today") : t("daysAgo", { days: ageDays })}
          </div>
        </div>
      )}
    </section>
  );
}
