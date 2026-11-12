export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Plug, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { getGoogleConnectionStatus } from "@/lib/google-oauth";
import { listImportableProperties } from "./actions";
import { ImportList } from "./import-list";

export default async function ImportClientsPage() {
  const tx = await getTranslations("ui.app_clients_import_page");
  const status = await getGoogleConnectionStatus();

  if (!status.configured) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Backlink />
        <PageHeader
          title={tx("importSitesFromGoogle")}
          description={tx("connectGoogleOnceThenEvery")}
          icon={Sparkles}
          accent="violet"
        />
        <div className="glass-apple relative overflow-hidden rounded-2xl p-6">
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {tx("youNeedToConnectA")}
            </p>
            <Link
              href="/settings/google"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-violet-500/25 ring-1 ring-inset ring-white/15 transition-colors hover:bg-primary/90"
            >
              <Plug className="size-4" />
              {tx("connectGoogle")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const result = await listImportableProperties();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Backlink />
      <PageHeader
        title={tx("importSitesFromGoogle")}
        description={
          status.email
            ? tx("showingSitesAccessibleToEach", { email: status.email })
            : tx("showingEverySearchConsoleAnalytics")
        }
        icon={Sparkles}
        accent="violet"
      />

      <div className="glass-apple relative overflow-hidden rounded-2xl p-6">
        {result.ok ? (
          <ImportList pairs={result.pairs} />
        ) : (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {tx("couldnTListProperties", { error: result.error })}
          </div>
        )}
      </div>
    </div>
  );
}

function Backlink() {
  const tx = useTranslations("ui.app_clients_import_page");
  return (
    <Link
      href="/clients"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3" />
      {tx("backToClients")}
    </Link>
  );
}
