export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Inbox } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, dailySchedules, publishQueue } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { SchedulesEditor } from "./editor";

export default async function ClientAutomationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tx = await getTranslations("ui.app_clients_id_automations_page");
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) notFound();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) notFound();

  const schedules = await db
    .select()
    .from(dailySchedules)
    .where(eq(dailySchedules.clientId, clientId))
    .orderBy(desc(dailySchedules.createdAt));

  const pendingCount = await db
    .select({ id: publishQueue.id })
    .from(publishQueue)
    .where(eq(publishQueue.clientId, clientId))
    .then((rows) => rows.length);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {tx("backTo", { name: client.name })}
      </Link>

      <PageHeader
        title={tx("dailyAutomation", { name: client.name })}
        description={tx("scheduleRecurringAutoGenerationBlog")}
        icon={Calendar}
        accent="cyan"
        actions={
          <Link
            href={`/clients/${clientId}/queue`}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/15 px-3 py-2 text-xs font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25"
          >
            <Inbox className="size-3.5" />
            {tx("reviewQueue", { pendingCount })}
          </Link>
        }
      />

      <SchedulesEditor
        clientId={clientId}
        clientName={client.name}
        wpConnected={Boolean(client.wpEndpoint && client.wpKey)}
        gbpUrl={client.gbpUrl ?? null}
        schedules={schedules}
      />
    </div>
  );
}
