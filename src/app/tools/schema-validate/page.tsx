export const dynamic = "force-dynamic";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { ValidateForm } from "./validate-form";

export default function SchemaValidatePage() {
  const t = useTranslations("tools.ui.schema-validate");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={ShieldCheck}
        accent="emerald"
      />
      <ValidateForm />
    </div>
  );
}
