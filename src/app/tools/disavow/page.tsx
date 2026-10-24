export const dynamic = "force-dynamic";

import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { DisavowForm } from "./disavow-form";

export default async function DisavowPage() {
  const t = await getTranslations("tools.ui.disavow");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={ShieldAlert}
        accent="rose"
      />
      <DisavowForm />
    </div>
  );
}
