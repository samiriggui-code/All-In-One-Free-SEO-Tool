export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Bot } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { listConversations, type ChatKind } from "@/lib/chat-store";
import { ChatsClient } from "./client";

type SearchParams = { kind?: string };

export default async function ChatsArchivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const tx = await getTranslations("ui.app_chats_page");
  const sp = await searchParams;
  const kind = (
    ["assistant", "seo_chat", "ask_tool", "portal_chat"].includes(sp.kind ?? "")
      ? sp.kind
      : undefined
  ) as ChatKind | undefined;

  const conversations = await listConversations({
    kind,
    limit: 200,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tx("aiChatHistory")}
        description={tx("everyConversationWithSeoChat")}
        icon={Bot}
        accent="violet"
        meta={
          <span className="text-xs text-muted-foreground">
            {tx("other", { length: conversations.length })}
            {conversations.filter((c) => c.pinned).length > 0 && (
              <>
                {tx("pinned", { length: conversations.filter((c) => c.pinned).length })}
              </>
            )}
          </span>
        }
      />
      <ChatsClient conversations={conversations} currentKind={kind ?? "all"} />
    </div>
  );
}
