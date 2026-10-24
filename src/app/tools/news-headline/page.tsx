export const dynamic = "force-dynamic";

import { Newspaper } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { HeadlineForm } from "./form";

export default function NewsHeadlinePage() {
  const t = useTranslations("tools.ui.news-headline");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Newspaper}
        accent="rose"
      />
      <HeadlineForm />
    </div>
  );
}
