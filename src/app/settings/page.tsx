export const dynamic = "force-dynamic";

import Link from "next/link";
import { count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { mayEdit } from "@/lib/auth";
import { requireSettingsPage } from "./access";
import { getLocalePreference } from "./locale-actions";
import { getThemePreference } from "./theme-actions";
import { cookies } from "next/headers";
import { FONT_SIZE_COOKIE, parseFontSize } from "@/lib/font-size";
import { FontSizeControl, LanguageControl, ThemeControl } from "./appearance-form";
import { SectionHeader, SettingRow, SettingsBlock } from "./section-ui";

/**
 * The window opens here: language, theme and what kind of workspace this
 * is. Everything else has its own section in the rail.
 */
export default async function SettingsPage() {
  const me = await requireSettingsPage("/settings");
  const t = await getTranslations("settings.general");

  const [locale, theme, canEdit] = await Promise.all([
    getLocalePreference(),
    getThemePreference(),
    mayEdit(),
  ]);
  const [{ value: teamCount }] = await db.select({ value: count() }).from(users);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fontSize = parseFontSize((await cookies()).get(FONT_SIZE_COOKIE)?.value);

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />

      <SettingsBlock title={t("appearance")}>
        <div>
          <SettingRow label={t("languageLabel")} description={t("languageHint")}>
            <LanguageControl locale={locale} />
          </SettingRow>
          <SettingRow label={t("themeLabel")} description={t("themeHint")}>
            <ThemeControl theme={theme} canEdit={canEdit} />
          </SettingRow>
          <SettingRow label={t("fontSizeLabel")} description={t("fontSizeHint")}>
            <FontSizeControl size={fontSize} />
          </SettingRow>
        </div>
      </SettingsBlock>

      <SettingsBlock title={t("workspace")}>
        <div>
          <SettingRow
            label={t("accessLabel")}
            description={
              teamCount > 0 ? t("accessAccounts", { count: teamCount }) : t("accessSingle")
            }
          >
            <Link
              href="/settings/team"
              className="gsk-link"
            >
              {t("manageTeam")}
              <ArrowRight className="size-3.5" />
            </Link>
          </SettingRow>
          <SettingRow label={t("timezoneLabel")} description={t("timezoneHint")}>
            <span className="text-sm text-muted-foreground">{tz}</span>
          </SettingRow>
          <SettingRow label={t("shortcutsLabel")} description={t("shortcutsHint")}>
            <Link
              href="/shortcuts"
              className="gsk-link"
            >
              {t("shortcutsOpen")}
              <ArrowRight className="size-3.5" />
            </Link>
          </SettingRow>
        </div>
        {me ? (
          <p className="mt-2 text-[13px] text-muted-foreground">
            {t("signedInAs", { name: me.name ?? me.email, role: me.role })}
          </p>
        ) : null}
      </SettingsBlock>
    </>
  );
}
