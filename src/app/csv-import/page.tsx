export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { asc } from "drizzle-orm";
import { FileUp } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import { CsvImportClient } from "./csv-import-client";

export default async function CsvImportPage() {
  const tx = await getTranslations("ui.app_csv-import_page");
  const allClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(await clientScope())
    .orderBy(asc(clients.name));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={tx("csvImport")}
        description={tx("dragAnyCsvClientsKeywords")}
        icon={FileUp}
        accent="cyan"
      />
      <CsvImportClient clients={allClients} />

      <section className="glass-apple relative overflow-hidden rounded-2xl p-5 text-sm">
        <h2 className="text-base font-semibold">{tx("whatGetsDetected")}</h2>
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 text-left font-medium">{tx("type")}</th>
              <th className="py-2 text-left font-medium">{tx("requiredHeaders")}</th>
              <th className="py-2 text-left font-medium">{tx("optionalHeaders")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-muted-foreground">
            <tr>
              <td className="py-2 font-mono text-foreground">clients</td>
              <td className="py-2">
                {tx.rich("urlOrWebsiteDomainName", { b0: (chunks) => <code>{chunks}</code>, b1: (chunks) => <code>{chunks}</code>, b2: (chunks) => <code>{chunks}</code>, b3: (chunks) => <code>{chunks}</code> })}
              </td>
              <td className="py-2">
                {tx.rich("nicheLocalEcommerceSaasBlog", { b0: (chunks) => <code>{chunks}</code> })}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-mono text-foreground">keywords</td>
              <td className="py-2">
                {tx.rich("keywordOrQuery", { b0: (chunks) => <code>{chunks}</code>, b1: (chunks) => <code>{chunks}</code> })}
              </td>
              <td className="py-2">
                <code>country</code>, <code>device</code>
              </td>
            </tr>
            <tr>
              <td className="py-2 font-mono text-foreground">outreach</td>
              <td className="py-2">
                <code>email</code> + <code>status</code>
              </td>
              <td className="py-2">
                <code>name</code>, <code>url</code>, <code>notes</code>
              </td>
            </tr>
            <tr>
              <td className="py-2 font-mono text-foreground">competitors</td>
              <td className="py-2">
                {tx.rich("competitorUrlOrUrl", { b0: (chunks) => <code>{chunks}</code>, b1: (chunks) => <code>{chunks}</code> })}
              </td>
              <td className="py-2">
                <code>name</code>, <code>notes</code>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
