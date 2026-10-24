"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { mayEdit } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  type Locale,
} from "@/i18n/config";
import { getSetting, setSetting } from "@/lib/settings-store";

export async function getLocalePreference(): Promise<Locale> {
  // No sign-in check: the root layout reads this for every page,
  // the login page included.
  const stored = await getSetting<string>("ui.locale");
  if (isLocale(stored)) return stored;
  return defaultLocale;
}

export async function setLocalePreference(locale: Locale) {
  // The toggle is in the shell for everyone; for a viewer it does nothing.
  if (!(await mayEdit())) return;
  await requireSignedIn();
  if (!isLocale(locale)) return;
  await setSetting("ui.locale", locale);
  const jar = await cookies();
  jar.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
