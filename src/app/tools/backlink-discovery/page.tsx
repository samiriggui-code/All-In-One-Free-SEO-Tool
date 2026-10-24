export const dynamic = "force-dynamic";

import { Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { DiscoveryForm } from "./discovery-form";

export default async function BacklinkDiscoveryPage() {
  const t = await getTranslations("tools.ui.backlink-discovery");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Link2}
        accent="violet"
      />
      <DiscoveryForm />
    </div>
  );
}
