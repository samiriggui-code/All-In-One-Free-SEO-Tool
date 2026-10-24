export const dynamic = "force-dynamic";

import { Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { AutoLinkForm } from "./form";

export default async function AutoLinkPage() {
  const t = await getTranslations("tools.ui.auto-link");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Link2}
        accent="violet"
      />
      <AutoLinkForm />
    </div>
  );
}
