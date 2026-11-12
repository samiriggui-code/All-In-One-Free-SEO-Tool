export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Target } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";

export default async function LandingPerfIndexPage() {
  const t = await getTranslations("pickers.landingPerf");
  const all = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));

  const cards: ClientToolCard[] = all.map((c) => {
    const hasGsc = Boolean(c.gscProperty);
    const hasGa4 = Boolean(c.ga4PropertyId);
    return {
      id: c.id,
      name: c.name,
      url: c.url,
      logoUrl: c.logoUrl,
      niche: c.niche,
      primary:
        hasGsc && hasGa4
          ? t("both")
          : hasGsc
            ? t("gscOnly")
            : t("none"),
      primaryTone: (
        hasGsc && hasGa4 ? "emerald" : hasGsc ? "amber" : "neutral"
      ) as "emerald" | "amber" | "neutral",
      secondary: hasGsc
        ? t("secondaryReady")
        : t("secondarySetup"),
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Target}
        accent="emerald"
      />
      <ClientToolGrid cards={cards} basePath="/landing-perf/c" />
    </div>
  );
}
