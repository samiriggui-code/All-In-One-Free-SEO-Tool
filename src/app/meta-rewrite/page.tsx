export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";

export default async function MetaRewriteIndexPage() {
  const t = await getTranslations("pickers.metaRewrite");
  const all = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));
  const cards: ClientToolCard[] = all.map((c) => ({
    id: c.id,
    name: c.name,
    url: c.url,
    logoUrl: c.logoUrl,
    niche: c.niche,
    primary: c.gscProperty ? t("ready") : t("gscNeeded"),
    primaryTone: (c.gscProperty ? "emerald" : "amber") as "emerald" | "amber",
    secondary: c.gscProperty
      ? t("secondaryReady")
      : t("secondarySetup"),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Sparkles}
        accent="violet"
      />
      <ClientToolGrid cards={cards} basePath="/meta-rewrite/c" />
    </div>
  );
}
