export const dynamic = "force-dynamic";

import { CornerDownRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { BulkRedirectForm } from "./bulk-form";

export default async function BulkRedirectsPage() {
  const t = await getTranslations("tools.ui.redirects-bulk");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={CornerDownRight}
        accent="cyan"
      />
      <BulkRedirectForm />
    </div>
  );
}
