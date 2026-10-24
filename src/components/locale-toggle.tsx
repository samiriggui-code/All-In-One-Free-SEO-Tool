"use client";

import { localeCookieName, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * FR / EN switch for the pages a signed-out visitor sees: the landing
 * page and the sign-in screens.
 *
 * A signed-out visitor cannot reach Settings → Language, so the choice is
 * written straight to the cookie the request config reads first, then the
 * page reloads in that language.
 */
export function LocaleToggle({
  current,
  tone = "dark",
}: {
  current: Locale;
  /** "dark" for a fixed dark background, "auto" to follow the theme. */
  tone?: "dark" | "auto";
}) {
  function choose(locale: Locale) {
    if (locale === current) return;
    // A plain cookie write: a server action would be refused for a
    // signed-out visitor, and nothing about this choice needs the server.
    // eslint-disable-next-line react-hooks/immutability -- document.cookie is a browser API, not React state
    document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-full border p-0.5 text-[11px] font-semibold uppercase",
        tone === "dark" ? "border-white/15" : "border-border",
      )}
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => choose(locale)}
          aria-pressed={locale === current}
          className={cn(
            "rounded-full px-2.5 py-1",
            locale === current
              ? tone === "dark"
                ? "bg-white text-slate-900"
                : "bg-foreground text-background"
              : tone === "dark"
                ? "text-white/60 hover:text-white"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
