"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { mayEdit } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setSetting, getSetting } from "@/lib/settings-store";

/**
 * "system" follows the OS preference and is the default — a tool that
 * ignores the OS setting and forces one look is the thing people
 * complain about, in either direction.
 */
export type ThemePreference = "light" | "dark" | "system";

export async function getThemePreference(): Promise<ThemePreference> {
  // No sign-in check: the root layout reads this for every page,
  // the login page included.
  const t = await getSetting<ThemePreference>("ui.theme");
  return t === "light" || t === "dark" || t === "system" ? t : "system";
}

export async function setThemePreference(theme: ThemePreference) {
  // The toggle is in the shell for everyone; for a viewer it does nothing.
  if (!(await mayEdit())) return;
  await requireSignedIn();
  await setSetting("ui.theme", theme);
  // Layout-level: the <html> class is rendered in the root layout, so
  // every route needs revalidating for the change to take effect.
  revalidatePath("/", "layout");
}

/** Cycle light -> dark -> system, for the single-button toggle. */
export async function cycleTheme() {
  // The toggle is in the shell for everyone; for a viewer it does nothing.
  if (!(await mayEdit())) return;
  await requireSignedIn();
  const current = await getThemePreference();
  const next: ThemePreference =
    current === "light" ? "dark" : current === "dark" ? "system" : "light";
  await setThemePreference(next);
}
