export const dynamic = "force-dynamic";

// @ai-partial: see app/content/actions.ts.

import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { canEdit, currentUser } from "@/lib/auth";
import { listPosts } from "@/lib/content-studio/store";
import type { LlmsTxtResource } from "@/lib/content-studio/seo/llms-txt";
import { ContentTools } from "./content-tools";

export default async function ContentToolsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId: raw } = await params;
  const clientId = Number(raw);
  if (!Number.isFinite(clientId)) notFound();

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) notFound();

  const [t, me, posts] = await Promise.all([
    getTranslations("content.tools"),
    currentUser(),
    listPosts(clientId),
  ]);
  const editable = !me || canEdit(me.role);

  // llms.txt lists what is live: published articles with a known URL.
  const published: LlmsTxtResource[] = posts
    .filter((p) => p.status === "published" && p.publishedUrl)
    .map((p) => ({
      title: p.title || p.primaryKeyword || p.publishedUrl!,
      url: p.publishedUrl!,
      summary: p.metaDescription || p.primaryKeyword || "",
    }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/content/c/${client.id}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {t("back")}
      </Link>
      <PageHeader title={t("title", { name: client.name })} description={t("description")} icon={Wrench} accent="violet" />
      <ContentTools
        clientId={client.id}
        editable={editable}
        site={{ name: client.name, url: client.url }}
        published={published}
      />
    </div>
  );
}
