export const dynamic = "force-dynamic";

import Link from "next/link";
import { FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { loadReportsOverview } from "@/lib/portfolio-data";
import { reportState } from "@/lib/portfolio";

/**
 * Every project's reports: the last one made, the schedule that sends the
 * next, and the projects with a report to make. It used to be a grid of
 * client cards showing an audit score, which is not a report.
 */
export default async function ReportsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; embed?: string }>;
}) {
  const t = await getTranslations("reports");
  const tg = await getTranslations("reportsGlobal");

  // Opened from a client (the project's tool rail): go to its own page.
  // Carry ?embed=1 through, or the drawer loads the shell inside itself.
  const { clientId, embed } = await searchParams;
  if (clientId && /^\d+$/.test(clientId)) {
    redirect(`/reports/c/${clientId}${embed ? "?embed=1" : ""}`);
  }

  const locale = await getLocale();
  const now = new Date();
  const { projects, recent } = await loadReportsOverview();
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const states = projects.map((p) => ({ p, state: reportState(p.lastReportAt, p.schedule !== null, now) }));
  // Reports to make first: they are the reason to open this page.
  const order = { due: 0, scheduled: 1, current: 2 } as const;
  states.sort((a, b) => order[a.state] - order[b.state] || a.p.name.localeCompare(b.p.name));
  const dueCount = states.filter((s) => s.state === "due").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={tg("description")}
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/reports/archive"
              className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {tg("archive")}
            </Link>
            <a
              href="/reports/export.csv"
              className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {t("exportAllCsv")}
            </a>
          </div>
        }
      />

      <section className="rounded-lg border border-border bg-card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">{tg("projectsTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dueCount > 0 ? tg("dueCount", { count: dueCount }) : tg("allCurrent")}
          </p>
        </header>
        {projects.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">{tg("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">{tg("colProject")}</th>
                  <th className="px-3 py-2 font-medium">{tg("colState")}</th>
                  <th className="px-3 py-2 font-medium">{tg("colLast")}</th>
                  <th className="px-3 py-2 font-medium">{tg("colSchedule")}</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {states.map(({ p, state }) => (
                  <tr key={p.id} className="transition-colors hover:bg-accent">
                    <td className="min-w-[12rem] px-5 py-2.5">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.url.replace(/^https?:\/\//, "")}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          state === "current"
                            ? "gsk-tag gsk-tag--success"
                            : state === "scheduled"
                              ? "gsk-tag gsk-tag--default"
                              : "gsk-tag gsk-tag--warning"
                        }
                      >
                        {tg(`state_${state}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {p.lastReportAt ? date.format(p.lastReportAt) : tg("none")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {p.schedule
                        ? tg(p.schedule.frequency === "weekly" ? "weekly" : "monthly") +
                          (p.schedule.nextSendAt ? ` · ${tg("nextOn", { date: date.format(p.schedule.nextSendAt) })}` : "")
                        : tg("noSchedule")}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link href={`/reports/c/${p.id}`} className="text-xs font-medium text-primary hover:underline">
                        {state === "due" ? tg("make") : tg("open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">{tg("recentTitle")}</h2>
          <Link href="/reports/archive" className="text-xs text-muted-foreground hover:text-foreground">
            {tg("archive")}
          </Link>
        </header>
        {recent.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">{tg("recentEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <div className="min-w-0">
                  <a href={`/api/report-archives/${r.id}/pdf`} className="font-medium hover:underline">
                    {r.title}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {r.clientName} · {date.format(r.createdAt)}
                  </p>
                </div>
                <span className={r.status === "sent" ? "gsk-tag gsk-tag--success" : r.status === "failed" ? "gsk-tag gsk-tag--warning" : "gsk-tag gsk-tag--default"}>
                  {tg(`archive_${r.status}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
