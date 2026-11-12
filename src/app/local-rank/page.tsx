export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";

export default async function LocalRankIndexPage() {
  const t = await getTranslations("pickers.localRank");
  const all = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));

  const cards: ClientToolCard[] = all.map((c) => ({
    id: c.id,
    name: c.name,
    url: c.url,
    logoUrl: c.logoUrl,
    niche: c.niche,
    primary: c.address ? t("hasAddress") : t("noAddress"),
    primaryTone: (c.address ? "emerald" : "amber") as "emerald" | "amber",
    secondary: t("secondary"),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={MapPin}
        accent="emerald"
      />
      <ClientToolGrid cards={cards} basePath="/local-rank/c" />
    </div>
  );
}
