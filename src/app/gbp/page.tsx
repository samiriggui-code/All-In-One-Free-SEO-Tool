export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Building } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";

export default async function GbpIndexPage() {
  const t = await getTranslations("pickers.gbp");
  const all = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));

  const cards: ClientToolCard[] = all.map((c) => ({
    id: c.id,
    name: c.name,
    url: c.url,
    logoUrl: c.logoUrl,
    niche: c.niche,
    primary: c.gbpUrl ? t("linked") : t("notLinked"),
    primaryTone: (c.gbpUrl ? "emerald" : "amber") as "emerald" | "amber",
    secondary: c.gbpUrl
      ? t("secondaryReady")
      : t("secondarySetup"),
    badges: c.gbpUrl
      ? [{ label: t("badgeReady"), tone: "emerald" as const }]
      : [{ label: t("badgeSetup"), tone: "amber" as const }],
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Building}
        accent="cyan"
      />
      <ClientToolGrid cards={cards} basePath="/gbp/c" />
    </div>
  );
}
