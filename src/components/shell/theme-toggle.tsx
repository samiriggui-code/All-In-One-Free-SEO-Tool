"use client";

import { useTransition } from "react";
import { Moon, Sun, MonitorSmartphone } from "lucide-react";
import { cycleTheme } from "@/app/settings/theme-actions";
import type { ThemePreference } from "@/app/settings/theme-actions";
import { useTranslations } from "next-intl";

const NEXT_LABEL: Record<ThemePreference, "toDark" | "toSystem" | "toLight"> = {
  light: "toDark",
  dark: "toSystem",
  system: "toLight",
};

/**
 * Single-button light / dark / system cycle.
 *
 * The class on <html> is applied optimistically here as well as
 * server-side, so the change is instant rather than waiting on the
 * server action's revalidation round-trip — a theme switch that lags
 * half a second feels broken.
 */
export function ThemeToggle({ theme }: { theme: ThemePreference }) {
  const [pending, startTransition] = useTransition();
  const t = useTranslations("shell.theme");

  function onClick() {
    const next: ThemePreference =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

    const root = document.documentElement;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    root.classList.toggle(
      "dark",
      next === "dark" || (next === "system" && prefersDark),
    );

    startTransition(() => {
      void cycleTheme();
    });
  }

  const Icon =
    theme === "light" ? Sun : theme === "dark" ? Moon : MonitorSmartphone;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={t(NEXT_LABEL[theme])}
      aria-label={t(NEXT_LABEL[theme])}
      className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
    >
      <Icon className="size-4" />
    </button>
  );
}
