export const dynamic = "force-dynamic";

import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { ClusterForm } from "./form";

export default function ClusterPage() {
  const t = useTranslations("tools.ui.cluster");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Layers}
        accent="cyan"
      />
      <ClusterForm />
    </div>
  );
}
