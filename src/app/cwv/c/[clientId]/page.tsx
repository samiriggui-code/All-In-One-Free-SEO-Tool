export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { desc, eq } from "drizzle-orm";
import { Gauge } from "lucide-react";
import { db } from "@/db/client";
import { clients, cwvReports } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { CwvRunner, type CwvRow } from "./cwv-runner";

export default async function PerClientCwvPage({
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

  const t = await getTranslations("auditTab.cwv");

  const reports = (await db
    .select()
    .from(cwvReports)
    .where(eq(cwvReports.clientId, clientId))
    .orderBy(desc(cwvReports.scannedAt))
    .limit(20)) as CwvRow[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      <PageHeader
        title={t("page.title", { name: client.name })}
        description={t("page.description")}
        icon={Gauge}
        accent="cyan"
      />

      <CwvRunner
        clientId={client.id}
        defaultUrl={client.url}
        reports={reports}
      />
    </div>
  );
}
