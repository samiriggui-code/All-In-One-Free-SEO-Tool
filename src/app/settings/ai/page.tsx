export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { canManageSettings } from "@/lib/auth";
import { getSetting } from "@/lib/settings-store";
import {
  configuredProviders,
  getActiveProvider,
  getOllamaUrl,
  type ActiveProvider,
} from "@/lib/api-keys";
import { MCP_TOOL_LIST } from "@/lib/mcp/server";
import { requireSettingsPage } from "../access";
import { ConnectionModePicker } from "../connection-mode";
import {
  getAiConnectionStatus,
  getConnectionMode,
  getMcpStatus,
} from "../connection-mode-actions";
import { ActiveProviderCard } from "../active-provider-card";
import { CreditSaverForm } from "../credit-saver-form";
import { ApiKeysSection } from "../api-keys-section";
import { DefaultModelForm } from "../default-model-form";
import { OwnerOnly, SectionHeader, SettingsBlock } from "../section-ui";

export default async function AiSettingsPage() {
  const me = await requireSettingsPage("/settings/ai");
  const isAdmin = !me || canManageSettings(me.role);
  const t = await getTranslations("settings.ai");
  const tOld = await getTranslations("settings");

  const activeProvider = await getActiveProvider();
  const defaultModel = (await getSetting<string>("ai.default_model")) ?? null;

  if (!isAdmin) {
    return (
      <>
        <SectionHeader title={t("title")} description={t("description")} />
        <OwnerOnly>{tOld("ownerOnlyAi")}</OwnerOnly>
        {/* The default model stays with editors, as its action allows. */}
        {activeProvider ? (
          <DefaultModelForm provider={activeProvider as ActiveProvider} initial={defaultModel} />
        ) : null}
      </>
    );
  }

  const { byId: configuredKeys } = await configuredProviders();
  const ollamaUrl = await getOllamaUrl();
  const creditSaverOn = Boolean(await getSetting<boolean>("ai.credit_saver.enabled"));
  const connectionMode = await getConnectionMode();
  const aiStatus = await getAiConnectionStatus();
  const mcpStatus = await getMcpStatus();
  // Read here rather than from window.location in the client component:
  // the two disagree during hydration and React errors on the mismatch.
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const appOrigin = `${proto}://${host}`;

  const keys = (
    <>
      <ActiveProviderCard
        active={activeProvider}
        configured={configuredKeys}
        defaultModel={defaultModel}
      />
      <CreditSaverForm initial={creditSaverOn} />
      <ApiKeysSection configured={configuredKeys} ollamaUrl={ollamaUrl} />
    </>
  );

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />

      <SettingsBlock>
        <ConnectionModePicker
          mode={connectionMode}
          status={aiStatus}
          mcp={mcpStatus}
          origin={appOrigin}
          installPath={process.cwd()}
          platform={process.platform}
          nodePath={process.execPath}
          mcpToolCount={MCP_TOOL_LIST.length}
          mcpToolNames={MCP_TOOL_LIST.map((tool) => tool.name)}
        />
      </SettingsBlock>

      {/* Keys stay reachable in every mode: someone on a subscription still
          wants a key for the overnight jobs, and hiding it would make that
          look impossible rather than optional. */}
      <SettingsBlock
        title={t("keysTitle")}
        description={connectionMode === "mcp" ? tOld("alsoAddApiKeyHint") : t("keysHint")}
      >
        <div className="space-y-5">{keys}</div>
      </SettingsBlock>
    </>
  );
}
