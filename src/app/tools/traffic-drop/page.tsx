export const dynamic = "force-dynamic";

import { TrendingDown } from "lucide-react";
import { SetupPrompt } from "@/components/setup-prompt";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { listGscProperties } from "@/lib/google-oauth";
import { TrafficDropForm } from "./traffic-drop-form";

export default async function TrafficDropPage() {
  const t = await getTranslations("tools.ui.traffic-drop");
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
        icon={TrendingDown}
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
        <TrafficDropForm properties={properties.map((p) => p.siteUrl)} />
      )}
    </div>
  );
}
