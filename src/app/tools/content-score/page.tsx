"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  Gauge,
  Loader2,
  Save,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  scoreContent,
  saveContentScoreSnapshot,
  type ContentScoreResult,
  type ContentStats,
} from "./actions";

export default function ContentScorePage() {
  const t = useTranslations("tools.ui.content-score");
  const tCommon = useTranslations("tools.common");
  const [content, setContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [pending, startTransition] = useTransition();
  const [savePending, startSave] = useTransition();
  const [result, setResult] = useState<ContentScoreResult | null>(null);
  const [saved, setSaved] = useState(false);

  function run() {
    if (!content.trim() || !keyword.trim()) return;
    setResult(null);
    setSaved(false);
    startTransition(async () => {
      setResult(await scoreContent({ content, targetKeyword: keyword }));
    });
  }

  function save() {
    if (!result || !result.ok) return;
    startSave(async () => {
      const r = await saveContentScoreSnapshot({
        content,
        targetKeyword: keyword,
        result,
      });
      if (r.ok) setSaved(true);
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
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <Gauge className="size-5 text-emerald-300" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-gradient-brand">{t("title")}</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </header>

      <section className="glass-apple relative overflow-hidden rounded-2xl space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="cs-keyword">{t("keywordLabel")}</Label>
          <Input
            id="cs-keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("keywordPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="cs-content">{t("contentLabel")}</Label>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {t("wordCount", {
                count: content.split(/\s+/).filter(Boolean).length,
              })}
            </span>
          </div>
          <textarea
            id="cs-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            placeholder={t("contentPlaceholder")}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={run}
            disabled={pending || !content.trim() || !keyword.trim()}
          >
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
      </section>

      {result && !result.ok && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="mr-2 inline size-4" />
          {result.error}
        </div>
      )}

      {result?.ok && (
        <>
          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <div className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto]">
              <ScoreBubble score={result.score} />
              <div className="space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("verdict")}
                </div>
                <p className="text-sm text-foreground/95">{result.verdict}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={save}
                disabled={savePending || saved}
              >
                {savePending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("saving")}
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-300" />
                    {tCommon("saved")}
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    {t("saveSnapshot")}
                  </>
                )}
              </Button>
            </div>
          </section>

          <StatsBlock stats={result.stats} />

          <div className="grid gap-4 md:grid-cols-2">
            <List
              title={t("strengths")}
              icon={TrendingUp}
              tone="emerald"
              items={result.strengths}
            />
            <List
              title={t("weaknesses")}
              icon={TrendingDown}
              tone="rose"
              items={result.weaknesses}
            />
          </div>

          {result.suggestedTerms.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl">
              <header className="border-b border-white/[0.06] px-5 py-4">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="size-4 text-violet-300" />
                  {t("termsTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("termsHelp")}
                </p>
              </header>
              <ul className="divide-y divide-white/[0.04]">
                {result.suggestedTerms.map((s, i) => (
                  <TermRow key={i} term={s.term} rationale={s.rationale} />
                ))}
              </ul>
            </section>
          )}

          {result.aiInsights.length > 0 && (
            <List
              title={t("insightsTitle")}
              icon={Eye}
              tone="violet"
              items={result.aiInsights}
            />
          )}
        </>
      )}
    </div>
  );
}

function StatsBlock({ stats }: { stats: ContentStats }) {
  const t = useTranslations("tools.ui.content-score");
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-3">
        <h2 className="text-base font-semibold">{t("stats")}</h2>
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("statWordCount")} value={stats.wordCount} />
        <Stat
          label={t("statReadingTime")}
          value={t("minutes", { count: stats.readingTimeMin })}
        />
        <Stat
          label={t("statReadingEase")}
          value={`${stats.fleschScore.toFixed(0)}`}
          hint={stats.fleschGrade}
        />
        <Stat
          label={t("statAvgWords")}
          value={stats.averageWordsPerSentence.toFixed(1)}
          hint={
            stats.averageWordsPerSentence > 22
              ? t("hintLong")
              : stats.averageWordsPerSentence < 12
                ? t("hintChoppy")
                : t("hintGood")
          }
        />
        <Stat
          label={t("statKeywordCount")}
          value={stats.primaryCount}
          hint={t("hintDensity", { pct: stats.primaryDensityPct.toFixed(2) })}
        />
        <Stat
          label={t("statShortSentences")}
          value={`${stats.shortSentencePct.toFixed(0)}%`}
          hint={
            stats.shortSentencePct < 20 ? t("hintLowRhythm") : t("hintGoodRhythm")
          }
        />
        <Stat
          label={t("statPassive")}
          value={`${stats.passiveVoicePct.toFixed(0)}%`}
          hint={stats.passiveVoicePct > 25 ? t("hintPassiveHigh") : t("hintOk")}
        />
        <Stat label={t("statSentences")} value={stats.sentenceCount} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function List({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: typeof Sparkles;
  tone: "emerald" | "rose" | "violet";
  items: string[];
}) {
  if (items.length === 0) return null;
  const cls = {
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
  }[tone];
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Icon className={`size-4 ${cls}`} />
          {title}
        </h2>
      </header>
      <ul className="divide-y divide-white/[0.04]">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 px-5 py-3 text-sm">
            <CheckCircle2 className={`mt-0.5 size-3.5 shrink-0 ${cls}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TermRow({ term, rationale }: { term: string; rationale: string }) {
  const t = useTranslations("tools.ui.content-score");
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(term).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <li className="flex items-start gap-3 px-5 py-3 text-sm">
      <button
        type="button"
        onClick={copy}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-violet-500/15 hover:text-violet-300"
        title={t("copyTerm")}
      >
        {copied ? (
          <CheckCircle2 className="size-3.5 text-emerald-300" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{term}</div>
        <div className="text-xs text-muted-foreground">{rationale}</div>
      </div>
    </li>
  );
}

function ScoreBubble({ score }: { score: number }) {
  const t = useTranslations("tools.ui.content-score");
  const tone =
    score >= 80
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : score >= 50
        ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
        : "bg-rose-500/15 text-rose-300 ring-rose-500/30";
  return (
    <div
      className={`flex size-24 flex-col items-center justify-center rounded-2xl ring-1 ring-inset ${tone}`}
    >
      <div className="text-3xl font-bold tabular-nums">{score}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-80">
        {t("scoreLabel")}
      </div>
    </div>
  );
}
