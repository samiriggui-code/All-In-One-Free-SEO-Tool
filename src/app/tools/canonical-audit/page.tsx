export const dynamic = "force-dynamic";

import { GitMerge } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { CanonForm } from "./form";

export default function CanonicalAuditPage() {
  const t = useTranslations("tools.ui.canonical-audit");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={GitMerge}
        accent="amber"
      />
      <CanonForm />
    </div>
  );
}
