import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  type Locale,
} from "@/i18n/config";
import { getSetting } from "@/lib/settings-store";
import toolsCatalogEn from "../../messages/tools-catalog.en.json";
import toolsCatalogFr from "../../messages/tools-catalog.fr.json";
import toolPagesEn from "../../messages/tools-pages.en.json";
import toolPagesFr from "../../messages/tools-pages.fr.json";
import auditUiEn from "../../messages/audit-ui.en.json";
import auditUiFr from "../../messages/audit-ui.fr.json";
import reportUiEn from "../../messages/report-ui.en.json";
import reportUiFr from "../../messages/report-ui.fr.json";
import { TOOL_UI } from "./tools-ui";

async function resolveLocale(): Promise<Locale> {
  try {
    const jar = await cookies();
    const fromCookie = jar.get(localeCookieName)?.value;
    if (isLocale(fromCookie)) return fromCookie;
  } catch {
    /* cookies() can throw outside a request */
  }

  try {
    const fromSettings = await getSetting<string>("ui.locale");
    if (isLocale(fromSettings)) return fromSettings;
  } catch {
    /* DB may be unavailable during early boot */
  }

  return defaultLocale;
}

const TOOL_CATALOGS = {
  en: toolsCatalogEn,
  fr: toolsCatalogFr,
} as const;

const TOOL_PAGES = {
  en: toolPagesEn,
  fr: toolPagesFr,
} as const;

const AUDIT_UI = {
  en: auditUiEn,
  fr: auditUiFr,
} as const;

const REPORT_UI = {
  en: reportUiEn,
  fr: reportUiFr,
} as const;

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const base = (await import(`../../messages/${locale}.json`)).default;
  return {
    locale,
    // Without one, next-intl logs ENVIRONMENT_FALLBACK on every request and
    // dates can render in the server's zone on the server and the
    // browser's on the client, which React reports as a hydration mismatch.
    timeZone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    messages: {
      ...base,
      tools: {
        ...(base.tools ?? {}),
        catalog: TOOL_CATALOGS[locale],
        pages: TOOL_PAGES[locale],
        ui: TOOL_UI[locale],
      },
      auditUi: AUDIT_UI[locale],
      reportUi: REPORT_UI[locale],
    },
  };
});
