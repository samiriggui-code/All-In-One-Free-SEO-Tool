export const dynamic = "force-dynamic";

import { GitCompareArrows } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { IntersectForm } from "./intersect-form";

export default async function LinkIntersectPage() {
  const t = await getTranslations("tools.ui.link-intersect");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={GitCompareArrows}
        accent="violet"
      />
      <IntersectForm />
    </div>
  );
}
