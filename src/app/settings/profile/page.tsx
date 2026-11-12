export const dynamic = "force-dynamic";

import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { requireSettingsPage } from "../access";
import { SectionHeader, SettingRow, SettingsBlock } from "../section-ui";
import { ProfileForm } from "./profile-form";

/**
 * My profile, GsKnora's "Profil utilisateur": who I am in this workspace,
 * my photo and name, and my password. The only settings page that is the
 * person's rather than the workspace's, so managers and members open it
 * too (lib/permissions.ts, PERSONAL_SETTINGS_PREFIXES).
 */
export default async function ProfilePage() {
  const me = await requireSettingsPage("/settings/profile");
  const t = await getTranslations("settingsProfile");
  const tRoles = await getTranslations("auth.roles");
  const format = await getFormatter();

  // Solo or shared-password install: there is no account to describe.
  if (!me) {
    return (
      <>
        <SectionHeader title={t("title")} description={t("description")} />
        <SettingsBlock>
          <p className="gsk-note">{t("noAccounts")}</p>
          <Link href="/settings/team" className="gsk-link mt-3">
            {t("setUpTeam")}
            <ArrowRight className="size-3.5" />
          </Link>
        </SettingsBlock>
      </>
    );
  }

  const day = (d: Date | null) =>
    d ? format.dateTime(d, { dateStyle: "long" }) : t("never");

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />

      <ProfileForm
        name={me.name}
        email={me.email}
        avatar={me.avatar}
      />

      <SettingsBlock title={t("accountTitle")}>
        <div>
          <SettingRow label={t("emailLabel")} description={t("emailHint")}>
            <span className="gsk-value">{me.email}</span>
          </SettingRow>
          <SettingRow label={t("roleLabel")} description={t("roleHint")}>
            <span className="gsk-value">
              {tRoles.has(me.role) ? tRoles(me.role) : me.role}
            </span>
          </SettingRow>
          <SettingRow label={t("createdLabel")}>
            <span className="gsk-value">{day(me.createdAt)}</span>
          </SettingRow>
          <SettingRow label={t("lastLoginLabel")}>
            <span className="gsk-value">{day(me.lastLoginAt)}</span>
          </SettingRow>
          <SettingRow label={t("idLabel")} description={t("idHint")}>
            <span className="gsk-value gsk-mono">{me.id}</span>
          </SettingRow>
        </div>
      </SettingsBlock>
    </>
  );
}
