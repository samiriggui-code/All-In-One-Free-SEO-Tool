export const dynamic = "force-dynamic";

import { Image as ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { BulkAltForm } from "./form";

export default async function BulkAltPage() {
  const t = await getTranslations("tools.ui.bulk-alt");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={ImageIcon}
        accent="emerald"
      />
      <BulkAltForm />
    </div>
  );
}
