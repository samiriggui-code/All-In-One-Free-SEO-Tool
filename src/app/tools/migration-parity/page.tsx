export const dynamic = "force-dynamic";

import { GitMerge } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { ParityForm } from "./parity-form";

export default function MigrationParityPage() {
  const t = useTranslations("tools.ui.migration-parity");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={GitMerge}
        accent="amber"
      />
      <ParityForm />
    </div>
  );
}
