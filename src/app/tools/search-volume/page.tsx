export const dynamic = "force-dynamic";

import { TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { VolumeForm } from "./volume-form";

export default async function SearchVolumePage() {
  const t = await getTranslations("tools.ui.search-volume");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={TrendingUp}
        accent="cyan"
      />
      <VolumeForm />
    </div>
  );
}
