export const dynamic = "force-dynamic";

import { Video } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { YtAuditForm } from "./form";

export default async function YouTubeAuditPage() {
  const t = await getTranslations("tools.ui.youtube-audit");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Video}
        accent="rose"
      />
      <YtAuditForm />
    </div>
  );
}
