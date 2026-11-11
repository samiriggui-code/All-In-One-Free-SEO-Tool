export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { canManageSettings } from "@/lib/auth";
import { getSetting } from "@/lib/settings-store";
import { requireSettingsPage } from "../access";
import { WebhookForm } from "../webhook-form";
import { OwnerOnly, SectionHeader, SettingsBlock } from "../section-ui";

export default async function NotificationSettingsPage() {
  const me = await requireSettingsPage("/settings/notifications");
  const isAdmin = !me || canManageSettings(me.role);
  const t = await getTranslations("settings.notifications");
  const tOld = await getTranslations("settings");

  // The webhook URL carries its secret: owner only.
  const webhookUrl = isAdmin ? await getSetting<string>("webhook.url") : null;

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />

      <SettingsBlock>
        {isAdmin ? (
          <WebhookForm initialUrl={webhookUrl} />
        ) : (
          <OwnerOnly>{tOld("ownerOnlyWebhook")}</OwnerOnly>
        )}
      </SettingsBlock>

      <SettingsBlock title={t("howTitle")}>
        <dl className="grid gap-3 text-xs sm:grid-cols-3">
          {(["when", "what", "where"] as const).map((k) => (
            <div key={k} className="rounded-lg border border-border bg-muted/30 p-3">
              <dt className="font-medium text-foreground">{t(`${k}Title`)}</dt>
              <dd className="mt-1 text-muted-foreground">{t(`${k}Body`)}</dd>
            </div>
          ))}
        </dl>
      </SettingsBlock>
    </>
  );
}
