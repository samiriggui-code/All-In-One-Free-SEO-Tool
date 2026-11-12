export const dynamic = "force-dynamic";

// @ai-partial: see app/content/actions.ts.

import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CalendarDays, Download, Mic, PenLine, Wrench } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { AiRequiredNotice } from "@/components/ui/ai-required-notice";
import { canEdit, currentUser } from "@/lib/auth";
import { listPosts } from "@/lib/content-studio/store";
import { NewArticle } from "./new-article";
import { StatusBadge, ScoreBadge } from "./badges";

export default async function ClientContentPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: raw } = await params;
  const clientId = Number(raw);
  if (!Number.isFinite(clientId)) notFound();

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) notFound();

  const [t, format, me, posts] = await Promise.all([
    getTranslations("content"),
    getFormatter(),
    currentUser(),
    listPosts(clientId),
  ]);
  const editable = !me || canEdit(me.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <PageHeader
        title={t("clientTitle", { name: client.name })}
        description={t("clientDescription", { language: client.language || "en" })}
        icon={PenLine}
        accent="violet"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            { href: "calendar", icon: CalendarDays, title: t("calendar.linkTitle"), hint: t("calendar.linkHint") },
            { href: "voice", icon: Mic, title: t("voice.linkTitle"), hint: t("voice.linkHint") },
            { href: "tools", icon: Wrench, title: t("tools.linkTitle"), hint: t("tools.linkHint") },
          ] as const
        ).map((l) => (
          <Link
            key={l.href}
            href={`/content/c/${client.id}/${l.href}`}
            className="flex items-start gap-3 rounded-2xl border border-violet-400/20 bg-violet-400/5 px-4 py-3 hover:bg-violet-400/10"
          >
            <l.icon className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{l.title}</span>
              <span className="block text-xs text-muted-foreground">{l.hint}</span>
            </span>
          </Link>
        ))}
      </div>

      {editable && (
        <>
          <AiRequiredNotice because={t("aiBecause")} />
          <NewArticle clientId={client.id} />
        </>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold text-foreground">
            {t("listTitle", { count: posts.length })}
          </h2>
          {posts.some((p) => p.draftMarkdown?.trim()) && (
            <>
              <span className="text-xs text-muted-foreground">{t("exportAll")}</span>
              {(["wordpress", "ghost", "webflow"] as const).map((f) => (
                <a
                  key={f}
                  href={`/content/c/${client.id}/export?format=${f}`}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5"
                >
                  <Download className="size-3" />
                  {t(`exportFormats.${f}`)}
                </a>
              ))}
            </>
          )}
        </div>
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
            {t("listEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/5 bg-card/40">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/content/c/${client.id}/p/${p.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {p.title || p.primaryKeyword}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.primaryKeyword} · {format.relativeTime(p.updatedAt)}
                    </div>
                  </div>
                  <ScoreBadge score={p.contentScore} />
                  <StatusBadge status={p.status} label={t(`status.${p.status}`)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
