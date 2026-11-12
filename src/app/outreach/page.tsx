export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Send } from "lucide-react";
import { db } from "@/db/client";
import { clients, outreachContacts } from "@/db/schema";
import { desc, eq, count, and } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";
import { GmailScopeBanner } from "@/components/gmail-scope-banner";
import { clientScope } from "@/lib/client-scope";

export default async function OutreachIndexPage() {
  const t = await getTranslations("pickers.outreach");
  const all = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));

  const cards: ClientToolCard[] = await Promise.all(
    all.map(async (c) => {
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(outreachContacts)
        .where(eq(outreachContacts.clientId, c.id));
      const [{ value: won }] = await db
        .select({ value: count() })
        .from(outreachContacts)
        .where(
          and(
            eq(outreachContacts.clientId, c.id),
            eq(outreachContacts.status, "won"),
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
        secondary:
          won > 0 ? t("won", { count: won }) : total > 0 ? t("secondarySome") : t("secondaryNone"),
      };
    }),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Send}
        accent="violet"
      />
      <GmailScopeBanner />
      <ClientToolGrid cards={cards} basePath="/outreach/c" />
    </div>
  );
}
