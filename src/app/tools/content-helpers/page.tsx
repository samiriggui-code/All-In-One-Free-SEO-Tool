export const dynamic = "force-dynamic";

import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { ContentHelpers } from "./content-helpers";

export default async function ContentHelpersPage() {
  const t = await getTranslations("tools.ui.content-helpers");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Sparkles}
        accent="rose"
      />
      <ContentHelpers />
    </div>
  );
}
