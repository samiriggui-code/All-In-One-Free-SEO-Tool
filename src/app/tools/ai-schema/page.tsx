export const dynamic = "force-dynamic";

import { Code2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { AiSchemaForm } from "./ai-schema-form";

export default async function AiSchemaPage() {
  const t = await getTranslations("tools.ui.ai-schema");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Code2}
        accent="cyan"
      />
      <AiSchemaForm />
    </div>
  );
}
