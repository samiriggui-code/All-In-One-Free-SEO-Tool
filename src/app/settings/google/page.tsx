export const dynamic = "force-dynamic";

import Link from "next/link";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AlertCircle, Check, CheckCircle2 } from "lucide-react";
import {
  getGoogleConnectionStatus,
  resolveRedirectUriFromHeaders,
} from "@/lib/google-oauth";
import { getSetting } from "@/lib/settings-store";
import { serviceAccountEmail } from "@/lib/google-service-account";
import { requireSettingsPage } from "../access";
import { SectionHeader, SettingRow, SettingsBlock } from "../section-ui";
import { GoogleConnections } from "./google-connections";

type SearchParams = Promise<{ connected?: string; error?: string }>;

/**
 * Google, the GsKnora way: the window shows the two ways to connect and
 * what they unlock; setting either one up happens in a sheet
 * (google-connections.tsx).
 */
export default async function GoogleSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSettingsPage("/settings/google", { owner: true });
  const t = await getTranslations("settings.google");
  const params = await searchParams;
  const status = await getGoogleConnectionStatus();
  const clientId = await getSetting<string>("google.client_id");
  const clientSecret = await getSetting<string>("google.client_secret");
  const saEmail = await serviceAccountEmail().catch(() => null);

  // The URI shown MUST equal what the auth-init and callback routes send
  // to Google; the shared helper enforces it (a mismatch is Google's
  // "Error 400: invalid_request").
  const redirectUri = resolveRedirectUriFromHeaders(await headers());
  const connected = status.connected || Boolean(saEmail);

  return (
    <>
      <SectionHeader
        title={t("title")}
        description={t("description")}
        status={{ label: connected ? t("connected") : t("notConnected"), ok: connected }}
      />

      {params.connected === "1" ? (
        <p className="gsk-result gsk-status-ok mb-6">
          <CheckCircle2 className="mr-1 inline size-4" />
          {status.email ? t("justConnectedAs", { email: status.email }) : t("justConnected")}
        </p>
      ) : null}
      {params.error ? (
        <p className="gsk-result gsk-status-error mb-6">
          <AlertCircle className="mr-1 inline size-4" />
          {t("connectFailed")} <code className="gsk-code">{params.error}</code>
        </p>
      ) : null}

      <GoogleConnections
        serviceAccountEmail={saEmail}
        status={{
          connected: status.connected,
          email: status.email ?? null,
          credentialsSet: status.credentialsSet,
          credentialsFromEnv: status.credentialsFromEnv,
        }}
        clientId={clientId}
        hasSecret={Boolean(clientSecret)}
        redirectUri={redirectUri}
      />

      <SettingsBlock title={t("unlocksTitle")} description={t("unlocksHint")}>
        <ul className="grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2">
          {(["rankings", "quickWins", "decay", "reports", "pages", "free"] as const).map((k) => (
            <li key={k} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-[var(--gsk-text-3)]" />
              <span>
                <span className="font-medium">{t(`u_${k}`)}</span>{" "}
                <span className="text-[var(--gsk-text-2)]">{t(`u_${k}Body`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </SettingsBlock>

      <SettingsBlock title={t("nextTitle")}>
        <SettingRow label={t("propertiesLabel")} description={t("propertiesHint")}>
          <Link href="/clients" className="gsk-link">
            {t("openClients")}
          </Link>
        </SettingRow>
      </SettingsBlock>
    </>
  );
}
