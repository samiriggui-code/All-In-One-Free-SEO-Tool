export const dynamic = "force-dynamic";

import { ListChecks } from "lucide-react";
import { SetupPrompt } from "@/components/setup-prompt";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { listGscProperties } from "@/lib/google-oauth";
import { CoverageForm } from "./coverage-form";

export default async function GscCoveragePage() {
  const t = await getTranslations("tools.ui.gsc-coverage");
  let properties: { siteUrl: string }[] = [];
  try {
    properties = await listGscProperties();
  } catch {
    properties = [];
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={ListChecks}
        accent="emerald"
      />
      {properties.length === 0 ? (
        <SetupPrompt
          title={t("setupTitle")}
          detail={t("setupDetail")}
          href="/settings/google"
          cta={t("setupCta")}
        />
      ) : (
        <CoverageForm properties={properties.map((p) => p.siteUrl)} />
      )}
    </div>
  );
}
