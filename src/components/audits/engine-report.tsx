import { Check, Lightbulb, Minus, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { RuleStatus } from "@/audit/types";
import type { CategoryRow, EngineReport, RuleRow } from "@/lib/engine-report";
import { verdictForScore } from "@/lib/seomator-meta";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { setStatusForType } from "@/app/audits/issue-actions";
import { ReportFilters } from "./report-filters";

/**
 * The engine's results, laid out like SEOmator's HTML report: summary,
 * page snapshot, what to fix first, then every rule by category.
 */

const PASS_THRESHOLD = 70;

const STATUS_STYLE: Record<RuleStatus, { icon: typeof X; box: string; text: string }> = {
  fail: { icon: X, box: "bg-rose-500/15 ring-rose-400/30", text: "text-rose-300" },
  warn: { icon: Lightbulb, box: "bg-amber-500/15 ring-amber-400/30", text: "text-amber-300" },
  pass: { icon: Check, box: "bg-emerald-500/15 ring-emerald-400/30", text: "text-emerald-300" },
  "not-measured": { icon: Minus, box: "bg-white/5 ring-white/10", text: "text-muted-foreground" },
};

function scoreTone(score: number) {
  if (score >= 80) return { bar: "bg-emerald-400", text: "text-emerald-300", pill: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30" };
  if (score >= 60) return { bar: "bg-amber-400", text: "text-amber-300", pill: "bg-amber-500/15 text-amber-200 ring-amber-400/30" };
  return { bar: "bg-rose-400", text: "text-rose-300", pill: "bg-rose-500/15 text-rose-200 ring-rose-400/30" };
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.pathname + u.search || "/";
  } catch {
    return url;
  }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Resolves a page-relative `og:image` against the audited page; http(s) only. */
function absoluteUrl(src: string, base: string) {
  try {
    const u = new URL(src, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

function StatusIcon({ status }: { status: RuleStatus }) {
  const s = STATUS_STYLE[status];
  const Icon = status === "warn" ? null : s.icon;
  return (
    <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ${s.box} ${s.text}`}>
      {Icon ? <Icon className="size-3.5" /> : <span className="text-xs font-bold">!</span>}
    </span>
  );
}

export async function EngineReportView({
  report,
  auditId,
  activeTypes,
  pagesCrawled,
  issuesCount,
  badge,
  afterSnapshot,
}: {
  report: EngineReport;
  auditId: number;
  /** Issue types still open on this audit, for the per-rule actions */
  activeTypes: Set<string>;
  pagesCrawled: number | null;
  issuesCount: number;
  badge: React.ReactNode;
  /** Rendered between the page snapshot and the fix-first list (CWV, caps) */
  afterSnapshot?: React.ReactNode;
}) {
  const t = await getTranslations("audits.report");
  const ogImage = report.page?.og.image ? absoluteUrl(report.page.og.image, report.pages[0]) : null;
  const verdict = verdictForScore(report.score);
  const passed = report.score >= PASS_THRESHOLD;
  const multiPage = report.pages.length > 1;
  const issueTotal = report.totals.fail + report.totals.warn;

  const counts: { id: RuleStatus | "total"; label: string; value: number; tone: string }[] = [
    { id: "fail", label: t("failures"), value: report.totals.fail, tone: "text-rose-300" },
    { id: "warn", label: t("warnings"), value: report.totals.warn, tone: "text-amber-300" },
    { id: "pass", label: t("passed"), value: report.totals.pass, tone: "text-emerald-300" },
    { id: "not-measured", label: t("notMeasured"), value: report.totals["not-measured"], tone: "text-muted-foreground" },
    { id: "total", label: t("total"), value: report.totals.total, tone: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* SUMMARY */}
      <section className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-card/40 p-6 backdrop-blur-md sm:flex-row sm:items-center">
        <ScoreGauge score={report.score} size={140} label={verdict.label} />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                passed
                  ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
                  : "bg-rose-500/15 text-rose-200 ring-rose-400/30"
              }`}
            >
              {passed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              {passed ? t("verdictPassed", { threshold: PASS_THRESHOLD }) : t("verdictFailed", { threshold: PASS_THRESHOLD })}
            </span>
            <span className="text-xs text-muted-foreground">
              {verdict.grade} · {verdict.label}
            </span>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {counts.map((c) => (
              <div key={c.id}>
                <dt className="sr-only">{c.label}</dt>
                <dd className={`text-2xl font-semibold tabular-nums ${c.tone}`}>{c.value}</dd>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              {t("issuesSummary", { issues: issuesCount, pages: pagesCrawled ?? report.pages.length })}
            </span>
            {badge}
          </div>
        </div>
      </section>

      {/* PAGE SNAPSHOT */}
      {report.page ? (
        <>
          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md sm:grid-cols-6">
            {[
              [report.page.metrics.wordCount.toLocaleString(), t("words")],
              [report.page.metrics.internalLinks, t("internalLinks")],
              [report.page.metrics.externalLinks, t("externalLinks")],
              [report.page.metrics.images, t("images")],
              [`${report.page.metrics.textRatio}%`, t("textRatio")],
              [report.page.headings.length, t("headings")],
            ].map(([value, label]) => (
              <div key={String(label)} className="border-white/5 px-3 py-4 text-center [&:not(:last-child)]:border-r">
                <div className="text-xl font-semibold tabular-nums">{value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-3 rounded-2xl border border-white/5 bg-card/40 p-5 backdrop-blur-md">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("previewTitle")}
                {multiPage ? <span className="normal-case tracking-normal"> · {t("startPage")}</span> : null}
              </h2>
              <div className="text-xs font-medium text-muted-foreground">{t("googleResult")}</div>
              <div className="space-y-0.5 rounded-xl bg-black/20 p-3">
                <div className="truncate text-xs text-emerald-300/80">{report.page.canonical ?? report.pages[0]}</div>
                <div className="text-base text-sky-300">
                  {report.page.title ?? <span className="italic text-muted-foreground">{t("missingTitle")}</span>}
                </div>
                <div className="text-sm text-muted-foreground">
                  {report.page.description ?? <span className="italic">{t("missingDescription")}</span>}
                </div>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                {t("socialCard")}
                {report.page.twitterCard ? ` (twitter:card = ${report.page.twitterCard})` : ""}
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                {ogImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ogImage} alt="" loading="lazy" className="h-32 w-full bg-black/30 object-cover" />
                ) : null}
                <div className="space-y-0.5 p-3">
                  <div className="text-[11px] text-muted-foreground">
                    {report.page.og.siteName ?? hostOf(report.pages[0])}
                  </div>
                  <div className="text-sm font-semibold">
                    {report.page.og.title ?? report.page.title ?? <span className="italic text-muted-foreground">{t("missingTitle")}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {report.page.og.description ?? report.page.description ?? <span className="italic">{t("missingDescription")}</span>}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-card/40 p-5 backdrop-blur-md">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("outlineTitle")}
              </h2>
              {report.page.headings.length ? (
                <ol className="mt-3 divide-y divide-white/5">
                  {report.page.headings.slice(0, 40).map((h, i) => (
                    <li key={i} className="flex items-center gap-2 py-1.5 text-sm" style={{ paddingLeft: (h.level - 1) * 14 }}>
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${h.level === 1 ? "bg-sky-500/15 text-sky-300" : "bg-white/5 text-muted-foreground"}`}>
                        H{h.level}
                      </span>
                      <span className="truncate">{h.text}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm italic text-muted-foreground">{t("noHeadings")}</p>
              )}
            </section>
          </div>
        </>
      ) : null}

      {afterSnapshot}

      {/* FIX THESE FIRST */}
      {report.top.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md">
          <h2 className="border-b border-white/5 px-5 py-3 text-sm font-semibold">
            {t("fixFirst", { count: report.top.length, total: issueTotal })}
          </h2>
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-white/5">
                <th className="px-5 py-2 font-medium">{t("issue")}</th>
                {multiPage ? <th className="px-3 py-2 font-medium">{t("pagesCol")}</th> : null}
                <th className="px-5 py-2 font-medium">{t("severity")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {report.top.map((r) => {
                const pages = new Set(r.findings.flatMap((f) => f.pages));
                return (
                  <tr key={r.ruleId}>
                    <td className="px-5 py-2.5">
                      <a href={`#rule-${r.ruleId}`} className="flex items-center gap-3 hover:underline">
                        <StatusIcon status={r.status} />
                        <span>
                          <span className="block">{r.name}</span>
                          <span className="block text-xs text-muted-foreground">{r.categoryName}</span>
                        </span>
                      </a>
                    </td>
                    {multiPage ? (
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {pages.size === 1 ? shortUrl([...pages][0]) : pages.size > 1 ? t("pagesCount", { count: pages.size }) : "—"}
                      </td>
                    ) : null}
                    <td className="px-5 py-2.5">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-xs ring-1 ring-inset ${
                          r.status === "fail" ? "bg-rose-500/15 text-rose-200 ring-rose-400/30" : "bg-amber-500/15 text-amber-200 ring-amber-400/30"
                        }`}
                      >
                        {r.status === "fail" ? t("critical") : t("warning")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* EVERY RULE, BY CATEGORY */}
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <div className="sticky top-20 space-y-0.5">
            <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("categories")}
            </div>
            {report.categories.map((c) => {
              const n = c.counts.fail + c.counts.warn;
              return (
                <a
                  key={c.id}
                  href={`#cat-${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                >
                  <span className="truncate">{c.name}</span>
                  {n > 0 ? (
                    <span
                      className={`rounded px-1.5 text-[11px] tabular-nums ${
                        c.counts.fail > 0 ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {n}
                    </span>
                  ) : null}
                </a>
              );
            })}
          </div>
        </nav>

        <ReportFilters
          label={t("filterByStatus")}
          tabs={[
            { id: "all", label: t("all"), count: report.totals.total },
            { id: "fail", label: t("failures"), count: report.totals.fail },
            { id: "warn", label: t("warnings"), count: report.totals.warn },
            { id: "pass", label: t("passed"), count: report.totals.pass },
            { id: "not-measured", label: t("notMeasured"), count: report.totals["not-measured"] },
          ]}
        >
          <section className="rounded-2xl border border-white/5 bg-card/40 p-5 backdrop-blur-md">
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("categoryScores")}
            </h2>
            <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
              {report.categories.map((c) => {
                const tone = scoreTone(c.score);
                return (
                  <a key={c.id} href={`#cat-${c.id}`} className="grid grid-cols-[minmax(0,1fr)_80px_40px] items-center gap-3 text-sm hover:text-foreground">
                    <span className="truncate text-muted-foreground">{c.name}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${c.score}%` }} />
                    </span>
                    <span className={`text-right font-mono text-xs ${tone.text}`}>{c.score}%</span>
                  </a>
                );
              })}
            </div>
          </section>

          {report.categories.map((c) => (
            <CategoryCard key={c.id} category={c} auditId={auditId} activeTypes={activeTypes} multiPage={multiPage} t={t} />
          ))}
        </ReportFilters>
      </div>
    </div>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"audits.report">>>;

function CategoryCard({
  category: c,
  auditId,
  activeTypes,
  multiPage,
  t,
}: {
  category: CategoryRow;
  auditId: number;
  activeTypes: Set<string>;
  multiPage: boolean;
  t: T;
}) {
  const tone = scoreTone(c.score);
  return (
    <section id={`cat-${c.id}`} data-category={c.id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">{c.name}</h2>
          <span className={`rounded-md px-2 py-0.5 font-mono text-sm ring-1 ring-inset ${tone.pill}`}>{c.score}/100</span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-emerald-300">{t("passedCount", { count: c.counts.pass })}</span>
          <span className="text-amber-300">{t("warningsCount", { count: c.counts.warn })}</span>
          <span className="text-rose-300">{t("failedCount", { count: c.counts.fail })}</span>
          {c.counts["not-measured"] > 0 ? (
            <span className="text-muted-foreground">{t("notMeasuredCount", { count: c.counts["not-measured"] })}</span>
          ) : null}
        </div>
      </header>

      <ul className="divide-y divide-white/5">
        {c.issues.map((r) => (
          <RuleItem key={r.ruleId} rule={r} auditId={auditId} open={activeTypes.has(`seomator:${r.ruleId}`)} multiPage={multiPage} t={t} />
        ))}
      </ul>

      {c.quiet.length > 0 ? (
        <details data-quiet className="group border-t border-white/5">
          <summary className="cursor-pointer px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            {t("quiet", { count: c.quiet.length })}
          </summary>
          <ul className="divide-y divide-white/5 border-t border-white/5">
            {c.quiet.map((r) => (
              <li key={r.ruleId} data-status={r.status} className="flex items-center gap-3 px-5 py-2 text-sm">
                <StatusIcon status={r.status} />
                <span>{r.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{r.ruleId}</span>
                {r.status === "not-measured" ? (
                  <span className="ml-auto text-xs text-muted-foreground">{t("notMeasured")}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function RuleItem({
  rule: r,
  auditId,
  open,
  multiPage,
  t,
}: {
  rule: RuleRow;
  auditId: number;
  /** An open issue exists for this rule, so it can be closed from here */
  open: boolean;
  multiPage: boolean;
  t: T;
}) {
  const type = `seomator:${r.ruleId}`;
  return (
    <li id={`rule-${r.ruleId}`} data-status={r.status} className="scroll-mt-24 px-5 py-4">
      <div className="flex gap-3">
        <StatusIcon status={r.status} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-medium">{r.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{r.ruleId}</span>
          </div>
          {r.findings.map((f, i) => (
            <div key={i} className="text-sm text-foreground/90">
              {f.message}
              {multiPage && f.pages.length > 0 ? (
                <details className="mt-1 text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    {t("onPages", { count: f.pages.length })}
                  </summary>
                  <ul className="mt-1 space-y-0.5 border-l border-white/10 pl-3">
                    {f.pages.slice(0, 25).map((p) => (
                      <li key={p} className="truncate">{p}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ))}
          <details className="text-xs">
            <summary className="inline-flex cursor-pointer items-center gap-1.5 font-semibold uppercase tracking-wider text-sky-300 hover:text-sky-200">
              <Lightbulb className="size-3.5" />
              {t("howToFix")}
            </summary>
            <p className="mt-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 leading-relaxed text-sky-100/90">{r.fix}</p>
          </details>
          {open ? (
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <form action={setStatusForType.bind(null, auditId, type, "resolved")}>
                <button type="submit" className="rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/20">
                  {t("markResolved")}
                </button>
              </form>
              <form action={setStatusForType.bind(null, auditId, type, "ignored")}>
                <button type="submit" className="rounded-md bg-white/5 px-2 py-1 font-medium text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10">
                  {t("ignore")}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
