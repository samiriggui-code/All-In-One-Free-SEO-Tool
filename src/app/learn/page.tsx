import {
  GraduationCap,
  BookOpen,
  Lightbulb,
  ShieldAlert,
  CheckCircle2,
  Link2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { learnContent } from "./content";

export default async function LearnPage() {
  const c = learnContent(await getLocale());
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={c.title}
        description={c.description}
        icon={GraduationCap}
        accent="emerald"
        noHelp
      />

      {/* Golden rules */}
      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md">
        <div className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-emerald-500/15 blur-3xl" />
        <header className="relative border-b border-white/5 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle2 className="size-4 text-emerald-300" />
            {c.rulesTitle}
          </h2>
        </header>
        <ul className="relative divide-y divide-white/5">
          {c.goldenRules.map((rule, i) => (
            <li key={i} className="flex gap-4 px-5 py-4">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                {i + 1}
              </span>
              <p className="text-sm text-foreground/90">{rule}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Glossary */}
      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md">
        <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-cyan-500/15 blur-3xl" />
        <header className="relative border-b border-white/5 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="size-4 text-cyan-300" />
            {c.glossaryTitle}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {c.glossaryIntro}
          </p>
        </header>
        <ul className="relative divide-y divide-white/5">
          {c.glossary.map((g) => (
            <li key={g.term} className="px-5 py-4">
              <div className="flex items-baseline gap-3">
                <h3 className="text-sm font-semibold">{g.term}</h3>
                <span className="text-xs text-muted-foreground">
                  {g.short}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {c.whyItMatters}
                </span>{" "}
                {g.why}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Link building guide */}
      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md">
        <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-violet-500/15 blur-3xl" />
        <header className="relative border-b border-white/5 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="size-4 text-violet-300" />
            {c.linksTitle}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {c.linksIntro}
          </p>
        </header>

        <div className="relative px-5 py-4">
          <div className="mb-4 rounded-xl bg-rose-500/[0.05] p-3 ring-1 ring-inset ring-rose-500/20">
            <div className="text-xs font-semibold text-rose-300">
              {c.hardRulesTitle}
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {c.linkRules.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>

          <ul className="relative space-y-2">
            {c.linkPlays.map((p) => (
              <li
                key={p.name}
                className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-inset ring-white/[0.04]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      {c.effort} {c.levels[p.effort]}
                    </span>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                      {c.payoff} {c.levels[p.payoff]}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {p.summary}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SEO folklore */}
      <section className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md">
        <div className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-rose-500/15 blur-3xl" />
        <header className="relative border-b border-rose-500/20 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-rose-300">
            <ShieldAlert className="size-4" />
            {c.folkloreTitle}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {c.folkloreIntro}
          </p>
        </header>
        <ul className="relative divide-y divide-rose-500/10">
          {c.folklore.map((f) => (
            <li key={f.title} className="px-5 py-4">
              <div className="text-sm font-medium text-rose-200/80 line-through decoration-rose-400/60">
                {f.title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                <Lightbulb className="mr-1 inline size-3 text-amber-300" />
                {f.truth}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Learning the app, rather than SEO */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-card/40 px-5 py-4 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{c.toolTitle}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{c.toolIntro}</p>
        </div>
        <Link
          href="/docs"
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 dark:text-emerald-300"
        >
          {c.toolLink}
          <ArrowRight className="size-3" />
        </Link>
      </section>
    </div>
  );
}
