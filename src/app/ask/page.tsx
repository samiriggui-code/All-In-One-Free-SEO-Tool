export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { asc } from "drizzle-orm";
import { Bot } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import { AskClient } from "./ask-client";

export default async function AskPage() {
  const tx = await getTranslations("ui.app_ask_page");
  const allClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(await clientScope())
    .orderBy(asc(clients.name));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={tx("askTheTool")}
        description={tx("plainEnglishQAOn")}
        icon={Bot}
        accent="violet"
      />
      <AskClient clients={allClients} />
    </div>
  );
}
