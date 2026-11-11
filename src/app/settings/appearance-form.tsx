"use client";

import { useState, useTransition } from "react";
import { FONT_SCALES, FONT_SIZE_COOKIE, FONT_SIZES, type FontSize } from "@/lib/font-size";
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

/**
 * Text size, as in GsKnora: applied at once to <html> and remembered in a
 * cookie that the root layout reads on the next page (lib/font-size.ts).
 * Per browser, so it needs no rights: a viewer may read in large too.
 */
export function FontSizeControl({ size }: { size: FontSize }) {
  const t = useTranslations("settings.general");
  const [value, setValue] = useState<FontSize>(size);
  return (
    <Segmented
      value={value}
      options={FONT_SIZES.map((s) => ({ value: s, label: t(`fontSize_${s}`) }))}
      onChange={(next) => {
        setValue(next);
        const root = document.documentElement;
        root.style.setProperty("zoom", next === "normal" ? "" : String(FONT_SCALES[next]));
        root.style.setProperty("--rf-zoom", next === "normal" ? "" : String(FONT_SCALES[next]));
        root.dataset.fontSize = next;
        document.cookie = `${FONT_SIZE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      }}
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
