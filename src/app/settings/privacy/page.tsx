export const dynamic = "force-dynamic";

import path from "node:path";
import { getTranslations } from "next-intl/server";
import { MaintainerCredit } from "@/components/shell/maintainer-credit";
import { requireSettingsPage } from "../access";
import { SectionHeader, SettingsBlock } from "../section-ui";

export default async function PrivacySettingsPage() {
  await requireSettingsPage("/settings/privacy");
  const t = await getTranslations("settings.privacy");
  const dbPath = path.resolve(process.env.SEO_DB_PATH ?? path.join(process.cwd(), "data.db"));

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />

      <SettingsBlock title={t("promisesTitle")}>
        <ul className="space-y-3 text-sm">
          {(["telemetry", "local", "outbound"] as const).map((k) => (
            <li key={k} className="flex gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-medium">{t(`${k}Title`)}</strong>{" "}
                <span className="text-muted-foreground">{t(`${k}Body`)}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <code className="break-all">{dbPath}</code>
          <p className="mt-2 text-muted-foreground">{t("fileHint")}</p>
        </div>
      </SettingsBlock>

      {/* "Who built the tool", separate from the white-label brand.*
          settings the agency uses on its own reports. */}
      <SettingsBlock title={t("aboutTitle")}>
        <MaintainerCredit variant="block" />
      </SettingsBlock>
    </>
  );
}
