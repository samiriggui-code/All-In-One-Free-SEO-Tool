export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Bot } from "lucide-react";
import { db } from "@/db/client";
import { clients, aiSuggestions } from "@/db/schema";
import { desc, eq, count, and } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import {
  ClientToolGrid,
  type ClientToolCard,
} from "@/components/shell/client-tool-grid";
import { configuredProviders, getActiveProvider } from "@/lib/api-keys";
import { markSectionSeen } from "@/lib/unread-counts";
import { clientScope } from "@/lib/client-scope";

export default async function AgentIndexPage() {
  const t = await getTranslations("pickers.agent");
  await markSectionSeen("suggestions").catch(() => {});
  const all = await db
    .select()
    .from(clients)
    .where(await clientScope())
    .orderBy(desc(clients.createdAt))
    .limit(500);
  const active = await getActiveProvider();
  const { byId } = await configuredProviders();
  const aiReady = Boolean(active && byId[active]);

  const cards: ClientToolCard[] = await Promise.all(
    all.map(async (c) => {
      const [{ value: pending }] = await db
        .select({ value: count() })
        .from(aiSuggestions)
        .where(
          and(
            eq(aiSuggestions.clientId, c.id),
            eq(aiSuggestions.status, "new"),
          ),
        );
      const [{ value: applied }] = await db
        .select({ value: count() })
        .from(aiSuggestions)
        .where(
          and(
            eq(aiSuggestions.clientId, c.id),
            eq(aiSuggestions.status, "applied"),
          ),
        );

      return {
        id: c.id,
        name: c.name,
        url: c.url,
        logoUrl: c.logoUrl,
        niche: c.niche,
        primary:
          pending === 0
            ? applied > 0
              ? t("allAddressed")
              : t("readyToRun")
            : t("suggestions", { count: pending }),
        primaryTone: pending > 0 ? "violet" : applied > 0 ? "emerald" : "neutral",
        secondary:
          applied > 0
            ? t("applied", { count: applied })
            : pending > 0
              ? t("secondaryReview")
              : t("secondaryRun"),
        badges:
          pending > 0
            ? [{ label: t("pending", { count: pending }), tone: "violet" as const }]
            : undefined,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Bot}
        accent="violet"
      />

      {!aiReady && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          {t.rich("noProvider", {
            b: (chunks) => <strong>{chunks}</strong>,
            link: (chunks) => (
              <a href="/settings" className="text-amber-100 underline-offset-2 hover:underline">
                {chunks}
              </a>
            ),
          })}
        </div>
      )}

      <ClientToolGrid cards={cards} basePath="/agent/c" />
    </div>
  );
}
