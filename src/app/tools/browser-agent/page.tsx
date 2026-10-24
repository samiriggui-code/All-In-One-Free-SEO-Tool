export const dynamic = "force-dynamic";

import { Bot } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { AgentForm } from "./agent-form";

export default async function BrowserAgentPage() {
  const t = await getTranslations("tools.ui.browser-agent");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Bot}
        accent="violet"
      />
      <AgentForm />
    </div>
  );
}
