import { ToolBackLink } from "@/components/tools/tool-back-link";
import { CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { FreshnessForm } from "./form";

export default async function FreshnessPage() {
  const t = await getTranslations("tools.ui.freshness");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ToolBackLink />

      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={CalendarClock}
        accent="emerald"
      />

      <FreshnessForm />
    </div>
  );
}
