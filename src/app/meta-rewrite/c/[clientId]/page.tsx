export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
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


  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <PageHeader
        title={`Meta-rewrite · ${client.name}`}
        description="Pulls GSC data, finds pages with high impressions and below-expected CTR, AI rewrites the title + meta description, and (if WP is connected) pushes the winning version live with one click."
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
