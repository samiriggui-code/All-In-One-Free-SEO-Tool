export const dynamic = "force-dynamic";

import { Map } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { SitemapForm } from "./sitemap-form";

export default async function SitemapPage() {
  const t = await getTranslations("tools.ui.sitemap");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Map}
        accent="cyan"
      />
      <SitemapForm />
    </div>
  );
}
