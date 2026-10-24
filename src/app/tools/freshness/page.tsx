import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { FreshnessForm } from "./form";

export default async function FreshnessPage() {
  const t = await getTranslations("tools.ui.freshness");
  const tCommon = await getTranslations("tools.common");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {tCommon("allTools")}
      </Link>

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
