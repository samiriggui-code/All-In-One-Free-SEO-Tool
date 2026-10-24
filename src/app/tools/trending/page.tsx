export const dynamic = "force-dynamic";

import { Flame } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { TrendingForm } from "./trending-form";

export default async function TrendingPage() {
  const t = await getTranslations("tools.ui.trending");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Flame}
        accent="amber"
      />
      <TrendingForm />
    </div>
  );
}
