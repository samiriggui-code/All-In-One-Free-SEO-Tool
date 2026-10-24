export const dynamic = "force-dynamic";

import { Unlink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { Soft404Form } from "./form";

export default async function Soft404Page() {
  const t = await getTranslations("tools.ui.soft-404");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Unlink}
        accent="rose"
      />
      <Soft404Form />
    </div>
  );
}
