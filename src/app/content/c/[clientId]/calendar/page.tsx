export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { canEdit, currentUser } from "@/lib/auth";
import { listPosts } from "@/lib/content-studio/store";
import { buildCalendar, dayKey, matchPerformance } from "@/lib/content-studio/publishing";
import { getGscPagePerformance } from "@/lib/google-data";
import { StatusBadge } from "../badges";
import { AutoSchedule, DateField } from "./calendar-controls";

const ymd = (daysAgo: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

/**
 * When each article goes out, and how the published ones are doing.
 * Dates are set here or spread automatically (lib/content-studio/publishing.ts);
 * the figures come from Search Console when the project is connected.
 */
export default async function ContentCalendarPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId: raw } = await params;
  const clientId = Number(raw);
  if (!Number.isFinite(clientId)) notFound();

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) notFound();

  const [t, tc, format, me, posts] = await Promise.all([
    getTranslations("content.calendar"),
    getTranslations("content"),
    getFormatter(),
    currentUser(),
    listPosts(clientId),
  ]);
  const editable = !me || canEdit(me.role);
  const plan = posts.map((p) => ({
    id: p.id,
    title: p.title || p.primaryKeyword || tc("untitled"),
    status: p.status,
    publishDate: p.publishDate,
  }));
  const { months, undated } = buildCalendar(plan);

  const published = posts.filter((p) => p.status === "published" && p.publishedUrl);
  // Search Console lags two days; 28 days like the rest of the app.
  const rows =
    published.length > 0 && client.gscProperty
      ? await getGscPagePerformance({
          siteUrl: client.gscProperty,
          startDate: ymd(30),
          endDate: ymd(2),
          rowLimit: 5000,
        })
      : [];
  const measured = matchPerformance(published, rows);

  const row = (p: (typeof plan)[number]) => (
    <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Link
        href={`/content/c/${client.id}/p/${p.id}`}
        className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline"
      >
        {p.title}
      </Link>
      <StatusBadge status={p.status} label={tc(`status.${p.status}`)} />
      {editable && p.status !== "published" ? (
        <DateField clientId={client.id} postId={p.id} value={p.publishDate ? dayKey(p.publishDate) : ""} />
      ) : (
        <span className="text-xs tabular-nums text-muted-foreground">
          {p.publishDate ? format.dateTime(p.publishDate, { dateStyle: "medium", timeZone: "UTC" }) : t("noDate")}
        </span>
      )}
    </li>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/content/c/${client.id}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {t("back")}
      </Link>
      <PageHeader title={t("title", { name: client.name })} description={t("description")} icon={CalendarDays} accent="violet" />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-semibold text-foreground">{t("undatedTitle", { count: undated.length })}</h2>
          {editable && undated.length > 0 && <AutoSchedule clientId={client.id} />}
        </div>
        {undated.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {posts.length === 0 ? t("empty") : t("allDated")}
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/40">
            {undated.map(row)}
          </ul>
        )}
      </section>

      {months.map((m) => (
        <section key={m.month} className="space-y-3">
          <h2 className="text-sm font-semibold capitalize text-foreground">
            {format.dateTime(new Date(`${m.month}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" })}
            <span className="ml-2 font-normal text-muted-foreground">{t("monthCount", { count: m.posts.length })}</span>
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/40">
            {m.posts.map(row)}
          </ul>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("measureTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("measureHint")}</p>
        {published.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("measureEmpty")}
          </p>
        ) : (
          <>
            {!client.gscProperty && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                {t("measureNoGsc")}{" "}
                <Link href={`/clients/${client.id}?tab=settings`} className="font-medium underline underline-offset-2">
                  {t("measureConnect")}
                </Link>
              </p>
            )}
            <div className="overflow-x-auto rounded-2xl border border-border bg-card/40">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 font-medium">{t("colArticle")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("colClicks")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("colImpressions")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("colPosition")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("colScore")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {measured.map(({ post, perf }) => (
                    <tr key={post.id}>
                      <td className="max-w-0 px-4 py-2.5">
                        <Link
                          href={`/content/c/${client.id}/p/${post.id}`}
                          className="block truncate font-medium text-foreground hover:underline"
                        >
                          {post.title || post.primaryKeyword}
                        </Link>
                        <a
                          href={post.publishedUrl!}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block truncate text-xs text-muted-foreground hover:underline"
                        >
                          {post.publishedUrl}
                        </a>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{perf ? format.number(perf.clicks) : "–"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {perf ? format.number(perf.impressions) : "–"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {perf ? format.number(perf.position, { maximumFractionDigits: 1 }) : "–"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{post.contentScore ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {client.gscProperty && <p className="text-xs text-muted-foreground">{t("measureNote")}</p>}
          </>
        )}
      </section>
    </div>
  );
}
