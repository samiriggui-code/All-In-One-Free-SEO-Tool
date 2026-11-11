export const dynamic = "force-dynamic";

import path from "node:path";
import Link from "next/link";
import { count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { db } from "@/db/client";
import { audits, clients, keywords, tasks } from "@/db/schema";
import { canManageSettings } from "@/lib/auth";
import { requireSettingsPage } from "../access";
import { SectionHeader, SettingsBlock } from "../section-ui";

export default async function DataSettingsPage() {
  const me = await requireSettingsPage("/settings/data");
  const isOwner = !me || canManageSettings(me.role);
  const t = await getTranslations("settings.data");
  const tOld = await getTranslations("settings");

  const [[c], [a], [tk], [k]] = await Promise.all([
    db.select({ value: count() }).from(clients),
    db.select({ value: count() }).from(audits),
    db.select({ value: count() }).from(tasks),
    db.select({ value: count() }).from(keywords),
  ]);
  const dbPath = path.resolve(process.env.SEO_DB_PATH ?? path.join(process.cwd(), "data.db"));

  const counters = [
    { label: tOld("counterClients"), value: c.value },
    { label: tOld("counterAudits"), value: a.value },
    { label: tOld("counterTasks"), value: tk.value },
    { label: tOld("counterKeywords"), value: k.value },
  ];

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />

      <SettingsBlock title={t("contentTitle")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {counters.map((x) => (
            <div key={x.label} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {x.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{x.value}</div>
            </div>
          ))}
        </div>
      </SettingsBlock>

      <SettingsBlock title={tOld("databaseFile")} description={t("fileHint")}>
        <code className="block break-all rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-xs">
          {dbPath}
        </code>
        {isOwner ? (
          <Link
            href="/settings/backup"
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {t("backupLink")}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </SettingsBlock>
    </>
  );
}
