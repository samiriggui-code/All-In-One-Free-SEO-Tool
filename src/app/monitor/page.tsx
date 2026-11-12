export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Activity } from "lucide-react";
import { db } from "@/db/client";
import { clients, monitoredPages } from "@/db/schema";
import { desc, eq, count, and } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";
import { markSectionSeen } from "@/lib/unread-counts";
import { clientScope } from "@/lib/client-scope";

export default async function MonitorIndexPage() {
  const t = await getTranslations("pickers.monitor");
  await markSectionSeen("page_changes").catch(() => {});
  const all = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));

  const cards: ClientToolCard[] = await Promise.all(
    all.map(async (c) => {
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(monitoredPages)
        .where(eq(monitoredPages.clientId, c.id));
      const [{ value: active }] = await db
        .select({ value: count() })
        .from(monitoredPages)
        .where(
          and(
            eq(monitoredPages.clientId, c.id),
            eq(monitoredPages.status, "active"),
          ),
        );
      return {
        id: c.id,
        name: c.name,
        url: c.url,
        logoUrl: c.logoUrl,
        niche: c.niche,
        primary: total === 0 ? t("none") : t("count", { count: total }),
        primaryTone: total > 0 ? "violet" : "neutral",
        secondary: total > 0 ? t("active", { count: active }) : t("secondaryNone"),
      };
    }),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Activity}
        accent="violet"
      />
      <ClientToolGrid cards={cards} basePath="/monitor/c" />
    </div>
  );
}
