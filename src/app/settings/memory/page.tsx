export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { userMayEdit, visibleClientIds } from "@/lib/auth";
import { listVisibleMemories, memoryEnabledFor } from "@/lib/assistant/memory";
import { requireSettingsPage } from "../access";
import { SectionHeader } from "../section-ui";
import { MemoryPanel } from "./memory-panel";

/**
 * Ma mémoire (IA-4): everything the assistant keeps between
 * conversations, for me, for the team and for the clients I can see.
 * Personal page: members open it too (PERSONAL_SETTINGS_PREFIXES).
 */
export default async function MemoryPage() {
  const me = await requireSettingsPage("/settings/memory");
  const t = await getTranslations("settingsMemory");
  const memories = await listVisibleMemories(me);
  const visible = await visibleClientIds(me);
  const clientRows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(visible === null ? undefined : inArray(clients.id, visible.length ? visible : [-1]));

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />
      <MemoryPanel
        enabled={await memoryEnabledFor(me)}
        hasAccount={!!me}
        mayEdit={userMayEdit(me)}
        myId={me?.id ?? null}
        clients={clientRows}
        memories={memories.map((m) => ({
          id: m.id,
          scope: m.scope,
          userId: m.userId,
          clientId: m.clientId,
          text: m.text,
          category: m.category,
          status: m.status,
          source: m.source,
          edited: m.edited,
          updatedAt: m.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
