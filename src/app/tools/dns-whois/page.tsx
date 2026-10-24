export const dynamic = "force-dynamic";

import { Globe } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { DnsForm } from "./dns-form";

export default async function DnsPage() {
  const t = await getTranslations("tools.ui.dns-whois");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Globe}
        accent="cyan"
      />
      <DnsForm />
    </div>
  );
}
