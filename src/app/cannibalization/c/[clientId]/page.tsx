export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import {
  AlertCircle,
  ExternalLink,
  GitMerge,
} from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import {
  detectKeywordCannibalization,
  type CannibalizationGroup,
} from "@/lib/google-data";

const sevTone: Record<CannibalizationGroup["severity"], string> = {
  high: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  low: "bg-white/5 text-muted-foreground ring-white/10",
};

export default async function PerClientCannibalizationPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: cidStr } = await params;
  const clientId = Number(cidStr);
  if (!Number.isFinite(clientId)) notFound();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) notFound();

  const t = await getTranslations("keywordsTab.cannibalization");

  if (!client.gscProperty) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle className="mr-2 inline size-4" />
          {t("connectGsc")}
        </div>
      </div>
    );
  }

  const groups = await detectKeywordCannibalization({
    siteUrl: client.gscProperty,
    days: 28,
    minImpressions: 30,
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <PageHeader
        title={t("title", { name: client.name })}
        description={t("description")}
        icon={GitMerge}
        accent="rose"
      />

      {groups.length === 0 ? (
        <div className="glass-apple relative overflow-hidden rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section
              key={g.query}
              className="glass-apple relative overflow-hidden rounded-2xl"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${sevTone[g.severity]}`}
                    >
                      {t(`severity.${g.severity}`)}
                    </span>
                    <h3 className="truncate font-semibold">{g.query}</h3>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                    <span>
                      {t("clicks", { count: g.totalClicks })}
                    </span>
                    <span>
                      {t("impressions", { count: g.totalImpressions })}
                    </span>
                    <span>{t("pagesCompeting", { count: g.pages.length })}</span>
                  </div>
                </div>
              </header>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">{t("col.page")}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t("col.position")}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t("col.clicks")}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t("col.impressions")}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t("col.ctr")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {g.pages.map((p) => (
                    <tr key={p.page} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-2">
                        <a
                          href={p.page}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 truncate font-mono text-xs hover:underline"
                        >
                          {p.page.replace(/^https?:\/\/[^/]+/, "") || "/"}
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </a>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.position.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.clicks}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {p.impressions}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {(p.ctr * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}

      <div className="glass-apple relative overflow-hidden rounded-2xl p-5 text-sm">
        <h2 className="text-base font-semibold">{t("fix.title")}</h2>
        <ol className="mt-2 space-y-1.5 text-muted-foreground">
          {(["step1", "step2", "step3", "step4"] as const).map((k) => (
            <li key={k}>
              {t.rich(`fix.${k}`, {
                b: (c) => <strong className="text-foreground">{c}</strong>,
              })}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
