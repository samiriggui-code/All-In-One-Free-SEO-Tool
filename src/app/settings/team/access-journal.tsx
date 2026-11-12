import { desc, eq, like, or } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { activityLog, users } from "@/db/schema";

/**
 * The access journal: invitations, role changes, deactivations, client
 * access and password changes, newest first. Read from the activity log
 * (kinds `team.*` and `account.*`, written by team/actions.ts and
 * profile/actions.ts); shown to the owner only.
 */
export async function AccessJournal({ limit = 30 }: { limit?: number }) {
  const t = await getTranslations("settingsTeam.journal");
  const format = await getFormatter();

  const rows = db
    .select({
      id: activityLog.id,
      message: activityLog.message,
      createdAt: activityLog.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(activityLog)
    .leftJoin(users, eq(users.id, activityLog.userId))
    .where(or(like(activityLog.kind, "team.%"), like(activityLog.kind, "account.%")))
    .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
    .limit(limit)
    .all();

  return (
    <section className="glass-apple rounded-xl p-4 sm:p-6">
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("hint")}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-sm">
              <span className="min-w-0">{r.message}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {r.actorName || r.actorEmail
                  ? t("by", { name: r.actorName || r.actorEmail || "" }) + " · "
                  : ""}
                {format.dateTime(r.createdAt, { dateStyle: "short", timeStyle: "short" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
