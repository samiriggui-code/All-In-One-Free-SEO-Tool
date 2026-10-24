export const dynamic = "force-dynamic";

import { Target } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { clients, aiVisibilityChecks, keywords } from "@/db/schema";
import { desc, eq, count, inArray, sql } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";

/**
 * GEO SWOT index. Landing page that lists every client so the user
 * picks one, then routes to the per-client SWOT report.
 *
 * The SWOT is generated on demand by the per-client page — this index
 * just shows a preview of coverage (how many AI checks / mentions the
 * client has, to hint whether a SWOT will be useful).
 */
export default async function GeoSwotIndex() {
  const t = await getTranslations("tools.ui.geo-swot");
  const all = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));

  const cards: ClientToolCard[] = await Promise.all(
    all.map(async (c) => {
      const [{ value: kwCount }] = await db
        .select({ value: count() })
        .from(keywords)
        .where(eq(keywords.clientId, c.id));

      let checksCount = 0;
      let mentionsCount = 0;
      if (kwCount > 0) {
        const kws = await db
          .select({ id: keywords.id })
          .from(keywords)
          .where(eq(keywords.clientId, c.id));
        if (kws.length > 0) {
          const rows = await db
            .select({
              total: sql<number>`count(*)`,
              mentions: sql<number>`sum(case when mentions_domain = 1 then 1 else 0 end)`,
            })
            .from(aiVisibilityChecks)
            .where(
              inArray(
                aiVisibilityChecks.keywordId,
                kws.map((k) => k.id),
              ),
            );
          checksCount = Number(rows[0]?.total ?? 0);
          mentionsCount = Number(rows[0]?.mentions ?? 0);
        }
      }

      const ready = checksCount >= 3;
      return {
        id: c.id,
        name: c.name,
        url: c.url,
        logoUrl: c.logoUrl,
        niche: c.niche,
        primary: ready
          ? t("cardMentions", { mentions: mentionsCount, checks: checksCount })
          : checksCount === 0
            ? t("cardNoChecks")
            : t("cardNeedMore", { count: checksCount }),
        primaryTone: ready ? "emerald" : "neutral",
        secondary: ready
          ? t("cardReady")
          : t("cardRunChecks"),
      };
    }),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Target}
        accent="rose"
      />

      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3 text-[12px] leading-relaxed text-violet-100/90">
        <div className="font-semibold text-violet-200">{t("howTitle")}</div>
        <p className="mt-1 opacity-90">
          {t("howBody")}
        </p>
      </div>

      <ClientToolGrid cards={cards} basePath="/tools/geo-swot/c" />
    </div>
  );
}
