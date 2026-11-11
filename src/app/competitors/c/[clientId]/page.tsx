export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { desc, eq } from "drizzle-orm";
import { Network, ExternalLink, X } from "lucide-react";
import { db } from "@/db/client";
import { clients, competitors } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { AddCompetitorForm } from "@/app/competitors/add-form";
import { deleteCompetitor } from "@/app/competitors/actions";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PerClientCompetitorsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: cidStr } = await params;
  const clientId = Number(cidStr);
  if (!Number.isFinite(clientId)) notFound();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) notFound();

  const t = await getTranslations("keywordsTab.competitors");

  const rows = await db
    .select()
    .from(competitors)
    .where(eq(competitors.clientId, clientId))
    .orderBy(desc(competitors.createdAt));

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      <PageHeader
        title={t("title", { name: client.name })}
        description={t("description")}
        icon={Network}
        accent="rose"
      />

      <AddCompetitorForm clients={[{ id: client.id, name: client.name }]} />

      {rows.length === 0 ? (
        <div className="glass-apple relative overflow-hidden rounded-2xl">
          <EmptyState
            icon={Network}
            title={t("emptyTitle")}
            body={t("emptyBody")}
          />
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md">
          <ul className="divide-y divide-white/5">
            {rows.map((c) => {
              const removeAction = deleteCompetitor.bind(null, c.id);
              return (
                <li
                  key={c.id}
                  className="px-5 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {c.url.replace(/^https?:\/\//, "")}
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                      {c.notes && (
                        <p className="text-xs text-muted-foreground">{c.notes}</p>
                      )}
                    </div>
                    <form action={removeAction}>
                      <button
                        type="submit"
                        aria-label={t("remove")}
                        className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <X className="size-3.5" />
                      </button>
                    </form>
                  </div>
                  <Link
                    href={`/clients/${client.id}`}
                    className="sr-only"
                  >
                    {t("forClient", { name: client.name })}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
