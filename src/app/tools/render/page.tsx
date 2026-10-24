export const dynamic = "force-dynamic";

import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { RenderForm } from "./render-form";

export default function RenderPage() {
  const t = useTranslations("tools.ui.render");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Camera}
        accent="cyan"
      />
      <RenderForm />
    </div>
  );
}
