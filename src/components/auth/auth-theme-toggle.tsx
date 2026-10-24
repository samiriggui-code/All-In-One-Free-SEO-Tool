"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { AUTH_THEME_KEY } from "./auth-theme-script";

/**
 * Light / dark switch for the sign-in screens.
 *
 * The workspace theme lives in Settings and is changed by a server
 * action, which a signed-out visitor cannot call. So the choice here
 * stays in this browser: a class on <html> now, and a localStorage key
 * that AUTH_THEME_SCRIPT (auth-theme-script.ts) applies on the next visit, before first paint.
 */


/** Watches the class on <html>, where every theme source ends up. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

export function AuthThemeToggle({ lightLabel, darkLabel }: { lightLabel: string; darkLabel: string }) {
  // Read from the DOM, not from props: the workspace theme, the OS
  // preference and this browser's stored choice all end up as this class.
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(AUTH_THEME_KEY, next ? "dark" : "light");
    } catch {
      /* private mode: the switch still works for this page */
    }
  }

  const label = dark ? lightLabel : darkLabel;
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
