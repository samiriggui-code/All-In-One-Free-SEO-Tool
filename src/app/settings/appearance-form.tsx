"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { localeLabels, type Locale } from "@/i18n/config";
import { setLocalePreference } from "./locale-actions";
import { setThemePreference, type ThemePreference } from "./theme-actions";

/*
 * The two controls only. The rows around them (label + hint) are drawn by
 * the server page with SettingRow: importing section-ui here as well put
 * that module in both the server and the client graph, and Turbopack dev
 * then recompiled and reloaded /settings in a loop.
 */

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="gsk-segmented" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LanguageControl({ locale }: { locale: Locale }) {
  const [pending, startTransition] = useTransition();
  return (
    <Segmented
      value={locale}
      disabled={pending}
      options={(Object.keys(localeLabels) as Locale[]).map((l) => ({
        value: l,
        label: localeLabels[l],
      }))}
      onChange={(l) => startTransition(async () => setLocalePreference(l))}
    />
  );
}

export function ThemeControl({
  theme,
  canEdit,
}: {
  theme: ThemePreference;
  /** setThemePreference is a no-op for viewers; don't offer it. */
  canEdit: boolean;
}) {
  const t = useTranslations("settings.general");
  const [pending, startTransition] = useTransition();
  return (
    <Segmented
      value={theme}
      disabled={pending || !canEdit}
      options={[
        { value: "light", label: t("themeLight") },
        { value: "dark", label: t("themeDark") },
        { value: "system", label: t("themeSystem") },
      ]}
      onChange={(v) => startTransition(async () => setThemePreference(v))}
    />
  );
}
