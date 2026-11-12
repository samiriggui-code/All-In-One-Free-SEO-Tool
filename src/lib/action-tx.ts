/**
 * The translator for a server action.
 *
 * Inside Next this is next-intl's `getTranslations`. The same actions are
 * also called from plain Node (the CI check scripts, the MCP server),
 * where next-intl's server entry refuses to run; there the messages are
 * read directly, in the workspace language.
 */

import { createTranslator } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getReportLocale } from "./report-i18n";
import type { Tx } from "./tx";

export async function actionTx(namespace: string): Promise<Tx> {
  try {
    return (await getTranslations(namespace)) as Tx;
  } catch {
    const locale = await getReportLocale();
    const messages = (await import(`../../messages/${locale}.json`)).default;
    return createTranslator({ locale, messages, namespace }) as unknown as Tx;
  }
}
