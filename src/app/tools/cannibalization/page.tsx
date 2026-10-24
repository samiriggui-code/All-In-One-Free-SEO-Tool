export const dynamic = "force-dynamic";

import { Split } from "lucide-react";
import { SetupPrompt } from "@/components/setup-prompt";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { listGscProperties } from "@/lib/google-oauth";
import { CannibalForm } from "./form";

export default async function CannibalizationPage() {
  const t = await getTranslations("tools.ui.cannibalization");
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
        icon={Split}
        accent="rose"
      />
      {properties.length === 0 ? (
        <SetupPrompt
          title={t("setupTitle")}
          detail={t("setupDetail")}
          href="/settings/google"
          cta={t("setupCta")}
        />
      ) : (
        <CannibalForm properties={properties.map((p) => p.siteUrl)} />
      )}
    </div>
  );
}
