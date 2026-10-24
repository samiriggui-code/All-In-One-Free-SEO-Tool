export const dynamic = "force-dynamic";

import { GitMerge } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { MigrationForm } from "./migration-form";

export default async function MigrationMapPage() {
  const t = await getTranslations("tools.ui.migration-map");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={GitMerge}
        accent="amber"
      />
      <MigrationForm />
    </div>
  );
}
