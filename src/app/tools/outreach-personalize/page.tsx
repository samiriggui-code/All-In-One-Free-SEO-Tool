export const dynamic = "force-dynamic";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { OutreachForm } from "./outreach-form";

export default function OutreachPersonalizePage() {
  const t = useTranslations("tools.ui.outreach-personalize");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Send}
        accent="rose"
      />
      <OutreachForm />
    </div>
  );
}
