export const dynamic = "force-dynamic";

import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { apiKeys, inboundWebhooks } from "@/db/schema";
import { canManageSettings } from "@/lib/auth";
import { requireSettingsPage } from "../access";
import { ApiKeyManager } from "../api-keys/manager";
import { InboundWebhooksManager } from "../inbound-webhooks/manager";
import { OwnerOnly, SectionHeader, SettingsBlock } from "../section-ui";

export default async function ApiSettingsPage() {
  const me = await requireSettingsPage("/settings/api");
  const isAdmin = !me || canManageSettings(me.role);
  const t = await getTranslations("settings.api");
  const tOld = await getTranslations("settings");

  const keyRows = isAdmin
    ? await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt)).limit(50)
    : null;
  // Each row carries the webhook's bearer token; the manager is a client
  // component, so only the owner gets the rows at all.
  const webhookRows = isAdmin
    ? await db.select().from(inboundWebhooks).orderBy(desc(inboundWebhooks.createdAt)).limit(50)
    : null;

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />

      <SettingsBlock
        title={t("keysTitle")}
        description={
          <>
            {t("keysHintBefore")}{" "}
            <code className="rounded bg-muted px-1 py-0.5">/api/v1/*</code>
            {t("keysHintAfter")}
          </>
        }
      >
        {keyRows ? (
          <ApiKeyManager
            initial={keyRows.map((k) => ({
              id: k.id,
              name: k.name,
              keyPrefix: k.keyPrefix,
              scopes: k.scopes,
              lastUsedAt: k.lastUsedAt,
              createdAt: k.createdAt,
              revokedAt: k.revokedAt,
            }))}
          />
        ) : (
          <OwnerOnly>{tOld("ownerOnlyApiKeys")}</OwnerOnly>
        )}
      </SettingsBlock>

      <SettingsBlock title={t("webhooksTitle")} description={t("webhooksHint")}>
        {webhookRows ? (
          <InboundWebhooksManager initial={webhookRows} />
        ) : (
          <OwnerOnly>{tOld("ownerOnlyInboundWebhooks")}</OwnerOnly>
        )}
      </SettingsBlock>
    </>
  );
}
