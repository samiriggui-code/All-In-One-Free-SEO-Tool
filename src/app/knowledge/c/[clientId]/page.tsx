export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { BookOpen, Brain } from "lucide-react";
import { listVisibleMemories } from "@/lib/assistant/memory";
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
  const memories = (await listVisibleMemories(me, { clientId })).filter((m) => m.status !== "rejected");

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
      {/* IA-4: what the assistant keeps about this client, changed in Settings → Ma mémoire. */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 inline-flex items-center gap-1.5 text-sm font-semibold">
            <Brain className="size-4 text-muted-foreground" />
            {t("memoryTitle")}
          </h2>
          <Link href="/settings/memory" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            {t("memoryManage")}
          </Link>
        </div>
        {memories.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">{t("memoryEmpty")}</p>
        ) : (
          <ul className="m-0 list-disc space-y-1 pl-5 text-sm">
            {memories.map((m) => (
              <li key={m.id}>
                {m.text}
                {m.status === "pending" ? <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">{t("memoryPending")}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
