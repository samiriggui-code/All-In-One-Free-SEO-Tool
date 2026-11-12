export const dynamic = "force-dynamic";

import { useTranslations } from "next-intl";
import { Bot } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { SeoChatUi } from "./chat-ui";

export default function SeoChatPage() {
  const tx = useTranslations("ui.app_seo-chat_page");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tx("seoChat")}
        description={tx("oneChatForEverySeo")}
        icon={Bot}
        accent="violet"
      />
      <SeoChatUi />
    </div>
  );
}
