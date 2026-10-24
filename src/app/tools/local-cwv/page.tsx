export const dynamic = "force-dynamic";

import { Gauge } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { LocalCwvForm } from "./local-cwv-form";

export default function LocalCwvPage() {
  const t = useTranslations("tools.ui.local-cwv");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Gauge}
        accent="amber"
      />
      <LocalCwvForm />
    </div>
  );
}
