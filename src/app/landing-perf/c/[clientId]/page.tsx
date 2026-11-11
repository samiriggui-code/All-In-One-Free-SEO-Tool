export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { AlertCircle, ExternalLink, Target } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { loadLandingPagePerf } from "@/lib/landing-page-perf";

export default async function PerClientLandingPerfPage({
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
  const t = await getTranslations("auditTab.landingPerf");


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

  const perf = await loadLandingPagePerf({
    gscProperty: client.gscProperty,
    ga4PropertyId: client.ga4PropertyId,
    clientIdScope: clientId,
    limit: 200,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      <PageHeader
        title={t("title", { name: client.name })}
        description={t("description")}
        icon={Target}
        accent="emerald"
      />

      {!client.ga4PropertyId && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {t("noGa4")}
        </div>
      )}

      {perf.length === 0 ? (
        <div className="glass-apple rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <section className="glass-apple relative overflow-hidden rounded-2xl">
          <header className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="text-base font-semibold">
              {t("tableTitle", { count: perf.length })}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("tableHint")}
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-left font-medium">{t("colPage")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("colClicks")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("colSessions")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("colConversions")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("colRate")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("colRevenue")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("colFixScore")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {perf.slice(0, 50).map((p) => (
                  <tr key={p.page} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5">
                      <a
                        href={p.page}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 truncate font-mono text-xs hover:underline"
                      >
                        {p.page.replace(/^https?:\/\/[^/]+/, "")}
                        <ExternalLink className="size-3 opacity-60" />
                      </a>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {p.clicks}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {p.sessions || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {p.conversions || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {p.conversionRate !== null
                        ? `${(p.conversionRate * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {p.revenue > 0 ? `$${Math.round(p.revenue)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <FixPill score={p.fixScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function FixPill({ score }: { score: number }) {
  let tone = "bg-white/5 text-muted-foreground ring-white/10";
  if (score >= 200) tone = "bg-rose-500/15 text-rose-300 ring-rose-500/30";
  else if (score >= 80) tone = "bg-amber-500/15 text-amber-300 ring-amber-500/30";
  else if (score >= 30) tone = "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ring-1 ring-inset ${tone}`}
    >
      {score}
    </span>
  );
}
