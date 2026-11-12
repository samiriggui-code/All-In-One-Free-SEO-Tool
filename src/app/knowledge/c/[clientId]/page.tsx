export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { BookOpen } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { canEdit, currentUser } from "@/lib/auth";
import { knowledgeStats, listDocuments } from "@/lib/kb/store";
import { syncClientKnowledge } from "@/lib/kb/sources";
import { KnowledgePanel } from "./knowledge-panel";

/**
 * A client's knowledge base: what the agency knows about this client,
 * searchable. Filled on its own from the app (profile, audits, articles,
 * briefs) and by hand (notes, web pages). The assistant will search it
 * (IA-3); this page lets a person see what is in it and test a search.
 */
export default async function KnowledgePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId: raw } = await params;
  const clientId = Number(raw);
  if (!Number.isInteger(clientId)) notFound();
  const [client] = await db.select({ id: clients.id, name: clients.name }).from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) notFound();
  const t = await getTranslations("knowledge");
  const me = await currentUser();
  const editable = !me || canEdit(me.role);

  // First visit: fill it now rather than leave an empty page until the
  // hourly sync. Cheap when nothing changed.
  let stats = await knowledgeStats(clientId);
  if (stats.documents === 0) {
    await syncClientKnowledge(clientId).catch(() => null);
    stats = await knowledgeStats(clientId);
  }
  const docs = await listDocuments(clientId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description", { name: client.name })}
        icon={BookOpen}
        crumbs={[{ label: client.name, href: `/clients/${clientId}` }, { label: t("title") }]}
      />
      <KnowledgePanel
        clientId={clientId}
        editable={editable}
        stats={{ ...stats, updatedAt: stats.updatedAt?.toISOString() ?? null }}
        documents={docs.map((d) => ({
          id: d.id,
          title: d.title,
          sourceType: d.sourceType,
          url: d.url,
          chunkCount: d.chunkCount,
          chars: d.chars,
          manual: d.manual,
          status: d.status,
          updatedAt: d.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
