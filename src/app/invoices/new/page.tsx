import { Receipt } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import { NewInvoiceForm } from "./new-form";
import { getNextInvoiceNumber } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const allClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(await clientScope())
    .orderBy(clients.name);

  const defaultInvoiceNumber = await getNextInvoiceNumber();
  const t = await getTranslations("invoices");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("form.title")}
        description={t("form.description")}
        icon={Receipt}
        accent="amber"
        crumbs={[{ label: t("title"), href: "/invoices" }, { label: t("form.crumb") }]}
      />
      <NewInvoiceForm
        clients={allClients}
        defaultInvoiceNumber={defaultInvoiceNumber}
      />
    </div>
  );
}
