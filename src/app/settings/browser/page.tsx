export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { canManageSettings } from "@/lib/auth";
import { requireSettingsPage } from "../access";
import { BrowserForm } from "../browser-form";
import { loadBrowserSettings } from "../browser-actions";
import { OwnerOnly, SectionHeader } from "../section-ui";

export default async function BrowserSettingsPage() {
  const me = await requireSettingsPage("/settings/browser");
  const isAdmin = !me || canManageSettings(me.role);
  const t = await getTranslations("settings.browser");
  const tOld = await getTranslations("settings");

  // Cookies and proxies are secrets the owner manages.
  const settings = isAdmin ? await loadBrowserSettings() : null;

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />
      {settings ? (
        <BrowserForm initial={settings} />
      ) : (
        <OwnerOnly>{tOld("ownerOnlyBrowser")}</OwnerOnly>
      )}
    </>
  );
}
