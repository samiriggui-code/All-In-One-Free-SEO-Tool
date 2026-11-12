export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { asc } from "drizzle-orm";
import { Globe } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import { KnowledgePanelClient } from "./client";

export default async function KnowledgePanelIndexPage() {
  const tx = await getTranslations("ui.app_knowledge-panel_page");
  const all = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(await clientScope())
    .orderBy(asc(clients.name));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tx("knowledgePanelMonitor")}
        description={tx("captureGoogleSBrandKnowledge")}
        icon={Globe}
        accent="violet"
      />
      <KnowledgePanelClient clients={all} />
    </div>
  );
}
