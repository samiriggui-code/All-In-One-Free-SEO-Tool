import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { Calendar, Inbox, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { dailySchedules, publishQueue } from "@/db/schema";

/**
 * Per-client entry point for daily automation. Lives on the client
 * overview page so the user notices it. Surfaces: schedule count,
 * pending review count, last publish — and direct links to manage.
 */
export async function DailyAutomationCard({
  clientId,
}: {
  clientId: number;
}) {
  const [schedulesRows, pendingRows, publishedRows] = await Promise.all([
    db
      .select({
        id: dailySchedules.id,
        enabled: dailySchedules.enabled,
        kind: dailySchedules.kind,
      })
      .from(dailySchedules)
      .where(eq(dailySchedules.clientId, clientId)),
    db
      .select({ id: publishQueue.id })
      .from(publishQueue)
      .where(
        and(
          eq(publishQueue.clientId, clientId),
          eq(publishQueue.status, "pending_review"),
        ),
      ),
    db
      .select({
        id: publishQueue.id,
        publishedAt: publishQueue.publishedAt,
      })
      .from(publishQueue)
      .where(
        and(
          eq(publishQueue.clientId, clientId),
          eq(publishQueue.status, "published"),
        ),
      )
      .limit(1),
  ]);

  const totalSchedules = schedulesRows.length;
  const activeSchedules = schedulesRows.filter((s) => s.enabled).length;
  const pendingCount = pendingRows.length;
  const lastPublished = publishedRows[0]?.publishedAt ?? null;

  const empty = totalSchedules === 0;
  const t = await getTranslations("clientPage.dailyAutomation");
  const locale = await getLocale();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-500/[0.06] to-violet-500/[0.04] backdrop-blur-md">
      <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0 flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-inset ring-cyan-500/30">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {empty
                ? t("empty")
                : `${t("active", { active: activeSchedules, total: totalSchedules })}${
                    pendingCount > 0 ? t("pending", { count: pendingCount }) : ""
                  }${
                    lastPublished
                      ? t("lastPublished", {
                          date: new Date(lastPublished).toLocaleString(locale, {
                            dateStyle: "short",
                            timeStyle: "short",
                          }),
                        })
                      : ""
                  }.`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {pendingCount > 0 && (
            <Link
              href={`/clients/${clientId}/queue`}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25"
            >
              <Inbox className="size-3.5" />
              {t("review", { count: pendingCount })}
            </Link>
          )}
          <Link
            href={`/clients/${clientId}/automations`}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25"
          >
            <Calendar className="size-3.5" />
            {empty ? t("setUp") : t("manage")}
          </Link>
        </div>
      </div>
    </section>
  );
}
