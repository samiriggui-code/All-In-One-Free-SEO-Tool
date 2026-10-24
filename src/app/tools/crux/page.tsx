export const dynamic = "force-dynamic";

import { Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { CruxForm } from "./crux-form";
import { CruxHistoryPanel } from "./crux-history";

export default function CruxPage() {
  const t = useTranslations("tools.ui.crux");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        // "the same data Google uses to rank your page experience" was
        // wrong and contradicted this tool's own origin-level sibling.
        // Google evaluates Core Web Vitals at origin level; URL-level
        // CrUX tells you which page is slow, not whether you pass.
        description={t("pageDescription")}
        icon={Activity}
        accent="emerald"
      />
      <CruxForm />
      <CruxHistoryPanel />
    </div>
  );
}
