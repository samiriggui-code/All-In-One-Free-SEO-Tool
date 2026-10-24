export const dynamic = "force-dynamic";

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { HreflangForm } from "./form";

export default function HreflangGenPage() {
  const t = useTranslations("tools.ui.hreflang-gen");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Globe}
        accent="cyan"
      />
      <HreflangForm />
    </div>
  );
}
