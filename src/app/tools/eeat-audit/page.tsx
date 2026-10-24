export const dynamic = "force-dynamic";

import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { EeatForm } from "./eeat-form";

export default async function EeatAuditPage() {
  const t = await getTranslations("tools.ui.eeat-audit");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={ShieldCheck}
        accent="emerald"
      />
      <EeatForm />
    </div>
  );
}
