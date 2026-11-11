export const dynamic = "force-dynamic";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { loadAllAudits, loadPortfolio } from "@/lib/portfolio-data";
import { scoreBand, weeklyCounts } from "@/lib/portfolio";

/**
 * Every audit of the agency, newest first, with a chart and the projects
 * that need a new one. It used to be a grid of client cards that only led
 * to each client's audits: the "all audits" view did not show any audit.
 */
export default async function AuditsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; embed?: string; projet?: string }>;
}) {
  const t = await getTranslations("audits");
  const tg = await getTranslations("auditsGlobal");
  const { clientId, embed, projet } = await searchParams;
  // Opened from a client (the project's tool rail), so the client is
  // already chosen: go to its own audits page. Carry ?embed=1 through, or
  // the drawer loads the full shell inside itself.
  if (clientId && /^\d+$/.test(clientId)) {
    redirect(`/audits/c/${clientId}${embed ? "?embed=1" : ""}`);
  }

  const locale = await getLocale();
  const now = new Date();
  const [all, portfolio] = await Promise.all([loadAllAudits(200), loadPortfolio(now)]);
  const only = projet && /^\d+$/.test(projet) ? Number(projet) : null;
  const rows = only === null ? all : all.filter((a) => a.clientId === only);
  const weeks = weeklyCounts(all.map((a) => a.at), now);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const dateTime = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // A project whose last audit is more than 30 days old describes a site
  // that has changed since; one never audited has no basis at all.
  const stale = portfolio.projects.filter(
    (p) => !p.lastAuditAt || now.getTime() - p.lastAuditAt.getTime() > 30 * 86_400_000,
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={tg("description")}
        icon={ClipboardList}
        actions={
          <a
            href="/audits/export.csv"
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {t("exportCsv")}
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="min-w-0 rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">{tg("weeksTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{tg("weeksHint")}</p>
          <div className="mt-4 flex h-28 items-end gap-2" role="img" aria-label={tg("weeksTitle")}>
            {weeks.map((w) => (
              <div key={w.week.getTime()} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">{w.count || ""}</span>
                <div
                  className="w-full rounded-sm bg-primary/80"
                  style={{ height: `${Math.max(2, (w.count / maxWeek) * 80)}px`, opacity: w.count ? 1 : 0.25 }}
                />
                <span className="text-[10px] text-muted-foreground">{day.format(w.week)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-border bg-card">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">{tg("staleTitle")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{tg("staleHint")}</p>
          </header>
          {stale.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">{tg("staleEmpty")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {stale.map((p) => (
                <li key={p.id}>
                  <Link href={`/audits/c/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-accent">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.lastAuditAt ? tg("lastOn", { date: day.format(p.lastAuditAt) }) : tg("never")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="min-w-0 rounded-lg border border-border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">
            {tg("listTitle")} <span className="font-normal text-muted-foreground">· {rows.length}</span>
          </h2>
          {portfolio.projects.length > 1 && (
            <nav className="flex flex-wrap gap-1" aria-label={tg("filterLabel")}>
              <FilterChip href="/audits" active={only === null} label={tg("allProjects")} />
              {portfolio.projects.map((p) => (
                <FilterChip key={p.id} href={`/audits?projet=${p.id}`} active={only === p.id} label={p.name} />
              ))}
            </nav>
          )}
        </header>
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">{t("emptyHint")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">{tg("colDate")}</th>
                  <th className="px-3 py-2 font-medium">{tg("colProject")}</th>
                  <th className="px-3 py-2 font-medium">{tg("colType")}</th>
                  <th className="px-3 py-2 text-right font-medium">{tg("colScore")}</th>
                  <th className="px-3 py-2 text-right font-medium">{tg("colIssues")}</th>
                  <th className="px-5 py-2 text-right font-medium">{tg("colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((a) => {
                  const band = a.score === null ? null : scoreBand(a.score);
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-accent">
                      <td className="whitespace-nowrap px-5 py-2.5">
                        <Link href={`/audits/${a.id}`} className="hover:underline">
                          {dateTime.format(a.at)}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/audits/c/${a.clientId}`} className="font-medium hover:underline">
                          {a.clientName}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {a.mode === "quick" ? tg("typeQuick") : tg("typeFull")}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                          band === "weak"
                            ? "text-red-600 dark:text-red-400"
                            : band === "fair"
                              ? "text-amber-600 dark:text-amber-400"
                              : band === "good"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                        }`}
                      >
                        {a.score ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{a.status === "completed" ? a.issuesCount : "—"}</td>
                      <td className="px-5 py-2.5 text-right">
                        <span
                          className={
                            a.status === "completed"
                              ? "gsk-tag gsk-tag--success"
                              : a.status === "failed"
                                ? "gsk-tag gsk-tag--warning"
                                : "gsk-tag gsk-tag--default"
                          }
                        >
                          {tg(`status_${a.status}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-md px-2 py-1 text-xs ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
}
