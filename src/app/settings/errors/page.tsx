import { getTranslations } from "next-intl/server";
import { listErrors } from "@/lib/error-log";
import { resolveErrorAction, clearResolvedAction } from "./actions";
import { ErrorLog } from "./error-log";
import { requireSettingsPage } from "../access";
import { SectionHeader } from "../section-ui";

export const dynamic = "force-dynamic";

/**
 * Error log, the GsKnora way: a compact table in the window, the detail
 * of each error in a sheet (error-log.tsx).
 */
export default async function ErrorsPage() {
  await requireSettingsPage("/settings/errors");
  const t = await getTranslations("settings.errorLog");
  const errors = await listErrors({ limit: 200, includeResolved: false });

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />
      <ErrorLog
        errors={errors.map((e) => ({
          id: e.id,
          source: e.source,
          context: e.context,
          message: e.message,
          stack: e.stack,
          url: e.url,
          userAgent: e.userAgent,
          occurrences: e.occurrences,
          firstSeenAt: e.firstSeenAt,
          lastSeenAt: e.lastSeenAt,
        }))}
        resolve={resolveErrorAction}
        clearResolved={clearResolvedAction}
      />
    </>
  );
}
