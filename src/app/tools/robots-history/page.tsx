export const dynamic = "force-dynamic";

import { History } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { listAllHosts } from "@/lib/robots-snapshots";
import { RobotsTracker } from "./tracker";

export default async function RobotsHistoryPage() {
  const hosts = await listAllHosts();
  const t = await getTranslations("tools.ui.robots-history");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={History}
        accent="amber"
      />
      <RobotsTracker initialHosts={hosts} />
    </div>
  );
}
