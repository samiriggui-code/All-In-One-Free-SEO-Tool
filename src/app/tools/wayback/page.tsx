export const dynamic = "force-dynamic";

import { History } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { WaybackForm } from "./form";

export default async function WaybackPage() {
  const t = await getTranslations("tools.ui.wayback");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={History}
        accent="violet"
      />
      <WaybackForm />
    </div>
  );
}
