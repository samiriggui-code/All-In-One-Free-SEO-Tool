export const dynamic = "force-dynamic";

import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { IntentForm } from "./intent-form";

export default async function IntentClassifierPage() {
  const t = await getTranslations("tools.ui.intent-classifier");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Compass}
        accent="cyan"
      />
      <IntentForm />
    </div>
  );
}
