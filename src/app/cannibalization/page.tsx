export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { asc } from "drizzle-orm";
import { GitMerge } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { ClientToolGrid } from "@/components/shell/client-tool-grid";
import { clientScope } from "@/lib/client-scope";

export default async function CannibalizationPickerPage() {
  const t = await getTranslations("pickers.cannibalization");
  const allClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      url: clients.url,
      logoUrl: clients.logoUrl,
      niche: clients.niche,
      gscProperty: clients.gscProperty,
    })
    .from(clients)
    .where(await clientScope())
    .orderBy(asc(clients.name));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={GitMerge}
        accent="rose"
      />
      <ClientToolGrid
        cards={allClients.map((c) => ({
          id: c.id,
          name: c.name,
          url: c.url,
          logoUrl: c.logoUrl,
          niche: c.niche,
          primary: c.gscProperty ? t("gscConnected") : t("gscNeeded"),
          primaryTone: c.gscProperty ? "emerald" : "amber",
          badges: c.gscProperty
            ? [{ label: t("badgeReady"), tone: "emerald" }]
            : [{ label: t("badgeSetup"), tone: "amber" }],
        }))}
        basePath="/cannibalization/c"
        emptyHint={t("emptyHint")}
      />
    </div>
  );
}
