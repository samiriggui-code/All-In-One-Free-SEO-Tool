export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import {
  GUEST_POST_SITES,
  pickSitesForNiche,
} from "@/lib/guest-post-sites";
import { listDraftsForClient } from "./actions";
import { GuestPostComposer } from "./composer";

export default async function GuestPostsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: clientIdRaw } = await params;
  const clientId = Number(clientIdRaw);
  if (!Number.isFinite(clientId) || clientId <= 0) notFound();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) notFound();

  const t = await getTranslations("linksTab.guestPosts");
  const recommended = pickSitesForNiche(client.niche);
  const drafts = await listDraftsForClient(clientId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href={`/link-building/c/${clientId}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {t("backLink", { name: client.name })}
      </Link>

      <PageHeader
        title={t("title", { name: client.name })}
        description={t("description")}
        icon={BookOpen}
        accent="amber"
      />

      <GuestPostComposer
        clientId={clientId}
        clientName={client.name}
        recommendedSites={recommended}
        allSites={GUEST_POST_SITES}
        drafts={drafts}
      />
    </div>
  );
}
