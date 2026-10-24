"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Gauge,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  estimateDifficulty,
  type DifficultyApiResult,
} from "./actions";

const bandTone: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  moderate: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  hard: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  very_hard: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

const intentTone: Record<string, string> = {
  informational: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  commercial: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  transactional: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  navigational: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
};

const BAND_LABEL_KEY: Record<string, string> = {
  easy: "bandEasy",
  moderate: "bandModerate",
  hard: "bandHard",
  very_hard: "bandVeryHard",
};

const INTENT_LABEL_KEY: Record<string, string> = {
  informational: "intentInformational",
  commercial: "intentCommercial",
  transactional: "intentTransactional",
  navigational: "intentNavigational",
};

export default function KeywordDifficultyPage() {
  const t = useTranslations("tools.ui.keyword-difficulty");
  const tCommon = useTranslations("tools.common");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DifficultyApiResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    if (!query.trim()) return;
    setResult(null);
    startTransition(async () => {
      const r = await estimateDifficulty(query);
      setResult(r);
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {tCommon("allTools")}
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-400/30">
            <Gauge className="size-5 text-amber-300" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-gradient-brand">{t("pageTitle")}</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("pageDescription")}
        </p>
      </header>

      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <Label htmlFor="kd-query" className="text-sm">
          {t("keyword")}
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="kd-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            placeholder={t("placeholder")}
            className="flex-1"
            disabled={pending}
          />
          <Button onClick={run} disabled={pending || !query.trim()}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("scoring")}
              </>
            ) : (
              <>
                <Search className="size-4" />
                {t("submit")}
              </>
            )}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("hint")}
        </p>
      </section>

      {result && !result.ok && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="mr-2 inline size-4" />
          {result.error}
        </div>
      )}

      {result?.ok && (
        <>
          {/* Headline */}
          <section className="glass-apple relative overflow-hidden rounded-2xl p-6">
            <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex size-32 shrink-0 items-center justify-center rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06]">
                <div className="text-center">
                  <div className="text-4xl font-bold tabular-nums text-gradient-brand">
                    {result.difficulty}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    / 100
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${bandTone[result.difficulty_band]}`}
                  >
                    {BAND_LABEL_KEY[result.difficulty_band]
                      ? t(BAND_LABEL_KEY[result.difficulty_band])
                      : result.difficulty_band.replace("_", " ")}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${intentTone[result.intent]}`}
                  >
                    {t("intentLabel", {
                      intent: INTENT_LABEL_KEY[result.intent]
                        ? t(INTENT_LABEL_KEY[result.intent])
                        : result.intent,
                    })}
                  </span>
                </div>
                <h2 className="truncate text-xl font-semibold">
                  {result.query}
                </h2>
                {result.summary && (
                  <p className="text-sm text-muted-foreground">
                    {result.summary}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Recommendation */}
          {result.recommendation && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="size-4 text-violet-300" />
                {t("howToCompete")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.recommendation}
              </p>
            </section>
          )}

          {/* Signal grid */}
          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-base font-semibold">{t("whyTitle")}</h2>
            </header>
            <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <SignalItem
                label={t("bigBrands")}
                value={String(result.signals.bigBrandsInTop10)}
                hint={
                  result.signals.bigBrandsInTop10 >= 4
                    ? t("bigBrandsHard")
                    : t("bigBrandsBeatable")
                }
              />
              <SignalItem
                label={t("uniqueDomains")}
                value={`${result.signals.uniqueDomainsInTop10}/10`}
                hint={
                  result.signals.uniqueDomainsInTop10 >= 9
                    ? t("uniqueDomainsHigh")
                    : t("uniqueDomainsLow")
                }
              />
              <SignalItem
                label="AI Overview"
                value={result.signals.aiOverviewPresent ? t("present") : t("absent")}
                hint={
                  result.signals.aiOverviewPresent
                    ? t("aiOverviewPresent")
                    : t("aiOverviewAbsent")
                }
              />
              <SignalItem
                label={t("featuredSnippet")}
                value={
                  result.signals.featuredSnippetPresent ? t("present") : t("absent")
                }
                hint={
                  result.signals.featuredSnippetPresent
                    ? t("featuredSnippetHint")
                    : null
                }
              />
              <SignalItem
                label={t("localPack")}
                value={result.signals.localPackPresent ? t("present") : t("absent")}
                hint={
                  result.signals.localPackPresent
                    ? t("localPackHint")
                    : null
                }
              />
              <SignalItem
                label={t("paa")}
                value={t("questions", { count: result.signals.paaCount })}
                hint={
                  result.signals.paaCount > 0
                    ? t("paaHint")
                    : null
                }
              />
              <SignalItem
                label={t("avgTitleLength")}
                value={t("words", { count: result.signals.avgWordsInTitle })}
                hint={
                  result.signals.avgWordsInTitle > 9
                    ? t("titleHeavy")
                    : t("titleReasonable")
                }
              />
            </dl>
          </section>

          {/* Top 10 */}
          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-base font-semibold">{t("top10Title")}</h2>
            </header>
            <ul className="divide-y divide-white/[0.04]">
              {result.signals.topResults.map((r) => (
                <li key={r.position} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-white/5 text-xs font-bold tabular-nums ring-1 ring-inset ring-white/10">
                    {r.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {r.domain}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function SignalItem({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string | null;
}) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-semibold">{value}</dd>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
