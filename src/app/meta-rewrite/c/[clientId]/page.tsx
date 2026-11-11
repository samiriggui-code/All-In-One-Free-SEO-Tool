export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { RewriteFlow } from "./rewrite-flow";

export default async function PerClientMetaRewritePage({
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

  const t = await getTranslations("keywordsTab.metaRewrite");

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <PageHeader
        title={t("title", { name: client.name })}
        description={t("description")}
        icon={Sparkles}
        accent="violet"
      />

      <RewriteFlow
        clientId={client.id}
        wpConnected={Boolean(client.wpEndpoint && client.wpKey)}
      />
    </div>
  );
}
