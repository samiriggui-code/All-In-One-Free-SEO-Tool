export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Unlink } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";

export default async function BrokenLinksIndexPage() {
  const t = await getTranslations("pickers.brokenLinks");
  const all = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));

  const cards: ClientToolCard[] = all.map((c) => ({
    id: c.id,
    name: c.name,
    url: c.url,
    logoUrl: c.logoUrl,
    niche: c.niche,
    primary: t("primary"),
    primaryTone: "violet" as const,
    secondary: t("secondary"),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Unlink}
        accent="rose"
      />
      <ClientToolGrid cards={cards} basePath="/broken-links/c" />
    </div>
  );
}
