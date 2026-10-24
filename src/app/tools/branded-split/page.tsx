export const dynamic = "force-dynamic";

import { GitMerge } from "lucide-react";
import { SetupPrompt } from "@/components/setup-prompt";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { listGscProperties } from "@/lib/google-oauth";
import { BrandedForm } from "./branded-form";

export default async function BrandedSplitPage() {
  const t = await getTranslations("tools.ui.branded-split");
  let properties: { siteUrl: string }[] = [];
  try {
    properties = await listGscProperties();
  } catch {
    properties = [];
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={GitMerge}
        accent="amber"
      />
      {properties.length === 0 ? (
        <SetupPrompt
          title={t("setupTitle")}
          detail={t("setupDetail")}
          href="/settings/google"
          cta={t("setupCta")}
        />
      ) : (
        <BrandedForm properties={properties.map((p) => p.siteUrl)} />
      )}
    </div>
  );
}
