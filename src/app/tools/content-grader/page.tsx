export const dynamic = "force-dynamic";

import { Gauge } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { GraderForm } from "./grader-form";

export default async function ContentGraderPage() {
  const t = await getTranslations("tools.ui.content-grader");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Gauge}
        accent="emerald"
      />
      <GraderForm />
    </div>
  );
}
