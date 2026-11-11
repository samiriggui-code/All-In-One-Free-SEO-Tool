export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { canManageSettings } from "@/lib/auth";
import { getSetting } from "@/lib/settings-store";
import { requireSettingsPage } from "../access";
import { SmtpForm } from "../smtp-form";
import { OwnerOnly, SectionHeader } from "../section-ui";

export default async function EmailSettingsPage() {
  const me = await requireSettingsPage("/settings/email");
  const isAdmin = !me || canManageSettings(me.role);
  const t = await getTranslations("settings.email");
  const tOld = await getTranslations("settings");

  // Read individually so the form gets an "initial" object without the
  // password value itself.
  const smtp = isAdmin
    ? {
        host: await getSetting<string>("smtp.host"),
        port: await getSetting<string>("smtp.port"),
        user: await getSetting<string>("smtp.user"),
        fromEmail: await getSetting<string>("smtp.from_email"),
        fromName: await getSetting<string>("smtp.from_name"),
        secure: await getSetting<string>("smtp.secure"),
        hasPassword: Boolean(await getSetting<string>("smtp.password")),
      }
    : null;

  return (
    <>
      <SectionHeader
        title={t("title")}
        description={t("description")}
        status={
          smtp
            ? { label: smtp.host ? t("configured") : t("notConfigured"), ok: Boolean(smtp.host) }
            : null
        }
      />
      {smtp ? <SmtpForm initial={smtp} /> : <OwnerOnly>{tOld("ownerOnlySmtp")}</OwnerOnly>}
    </>
  );
}
