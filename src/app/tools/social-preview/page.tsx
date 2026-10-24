export const dynamic = "force-dynamic";

import { Share2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { SocialForm } from "./social-form";

export default async function SocialPreviewPage() {
  const t = await getTranslations("tools.ui.social-preview");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Share2}
        accent="cyan"
      />
      <SocialForm />
    </div>
  );
}
