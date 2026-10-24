export const dynamic = "force-dynamic";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { RefreshForm } from "./refresh-form";

export default function RefreshDetectorPage() {
  const t = useTranslations("tools.ui.refresh");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={RefreshCw}
        accent="amber"
      />
      <RefreshForm />
    </div>
  );
}
