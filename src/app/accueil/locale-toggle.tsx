"use client";

import { localeCookieName, locales, type Locale } from "@/i18n/config";

/**
 * FR / EN switch for the public landing page.
 *
 * A signed-out visitor cannot reach Settings → Language, so the choice is
 * written straight to the cookie the request config reads first, then the
 * page reloads in that language.
 */
export function LocaleToggle({ current }: { current: Locale }) {
  function choose(locale: Locale) {
    if (locale === current) return;
    // A plain cookie write: a server action would be refused for a
    // signed-out visitor, and nothing about this choice needs the server.
    // eslint-disable-next-line react-hooks/immutability -- document.cookie is a browser API, not React state
    document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="flex items-center rounded-full border border-white/15 p-0.5 text-[11px] font-semibold uppercase">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => choose(locale)}
          aria-pressed={locale === current}
          className={
            locale === current
              ? "rounded-full bg-white px-2.5 py-1 text-slate-900"
              : "rounded-full px-2.5 py-1 text-white/60 hover:text-white"
          }
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
