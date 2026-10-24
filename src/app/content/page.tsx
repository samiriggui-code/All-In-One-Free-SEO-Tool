export const dynamic = "force-dynamic";

import { PenLine } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, contentPosts } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";

export default async function ContentIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; embed?: string }>;
}) {
  const t = await getTranslations("content");

  // Opened from a client's "tools" rail, so the client is already chosen.
  const { clientId, embed } = await searchParams;
  if (clientId && /^\d+$/.test(clientId)) {
    redirect(`/content/c/${clientId}${embed ? "?embed=1" : ""}`);
  }

  const all = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));
  const counts = new Map(
    (
      await db
        .select({ clientId: contentPosts.clientId, n: count() })
        .from(contentPosts)
        .groupBy(contentPosts.clientId)
    ).map((r) => [r.clientId, r.n]),
  );
  const published = new Map(
    (
      await db
        .select({ clientId: contentPosts.clientId, n: count() })
        .from(contentPosts)
        .where(eq(contentPosts.status, "published"))
        .groupBy(contentPosts.clientId)
    ).map((r) => [r.clientId, r.n]),
  );

  const cards: ClientToolCard[] = all.map((c) => {
    const n = counts.get(c.id) ?? 0;
    return {
      id: c.id,
      name: c.name,
      url: c.url,
      logoUrl: c.logoUrl,
      niche: c.niche,
      primary: n > 0 ? t("articleCount", { count: n }) : t("noArticles"),
      primaryTone: n > 0 ? "violet" : "neutral",
      secondary:
        n > 0
          ? t("publishedCount", { count: published.get(c.id) ?? 0 })
          : t("clickToStart"),
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={PenLine}
        accent="violet"
      />
      <ClientToolGrid cards={cards} basePath="/content/c" />
    </div>
  );
}
