export const dynamic = "force-dynamic";

import { Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { ProgramForm } from "./form";

export default async function ProgrammaticPage() {
  const t = await getTranslations("tools.ui.programmatic-seo");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Layers}
        accent="violet"
      />
      <ProgramForm />
    </div>
  );
}
