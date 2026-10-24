export const dynamic = "force-dynamic";

import { Network } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { LinkGraphForm } from "./form";

export default function LinkGraphPage() {
  const t = useTranslations("tools.ui.link-graph");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Network}
        accent="violet"
      />
      <LinkGraphForm />
    </div>
  );
}
