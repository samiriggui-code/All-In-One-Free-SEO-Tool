export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Mic } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { canEdit, currentUser } from "@/lib/auth";
import { getStyleProfile, listPosts } from "@/lib/content-studio/store";
import { VoiceEditor } from "./voice-editor";

/**
 * The client's voice: the style profile the outline and the article are
 * written with (clients.content_style_profile). It existed in the data
 * and in the writer, with no screen to see it, learn it or forget it.
 */
export default async function ContentVoicePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId: raw } = await params;
  const clientId = Number(raw);
  if (!Number.isFinite(clientId)) notFound();

  const [client] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) notFound();

  const [t, me, profile, posts] = await Promise.all([
    getTranslations("content.voice"),
    currentUser(),
    getStyleProfile(clientId),
    listPosts(clientId),
  ]);
  const editable = !me || canEdit(me.role);
  const ownArticles = posts.filter((p) => (p.draftMarkdown?.trim().length ?? 0) >= 200).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/content/c/${client.id}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {t("back")}
      </Link>
      <PageHeader title={t("title", { name: client.name })} description={t("description")} icon={Mic} accent="violet" />
      <VoiceEditor
        clientId={client.id}
        editable={editable}
        initial={(profile as Record<string, unknown> | null) ?? null}
        ownArticles={ownArticles}
      />
    </div>
  );
}
