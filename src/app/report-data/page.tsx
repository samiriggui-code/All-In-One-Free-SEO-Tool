import { getTranslations } from "next-intl/server";
import { desc } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import { ReportDataPaste } from "./paste";

export const dynamic = "force-dynamic";

export default async function ReportDataPage() {
  const tx = await getTranslations("ui.app_report-data_page");
  const allClients = await db
    .select({ id: clients.id, name: clients.name, url: clients.url })
    .from(clients)
    .where(await clientScope())
    .orderBy(desc(clients.createdAt));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tx("addWorkToYourReports")}
        description={tx("pastePlainTextBacklinksBuilt")}
        icon={Sparkles}
        accent="emerald"
      />
      <ReportDataPaste clients={allClients} />
    </div>
  );
}
