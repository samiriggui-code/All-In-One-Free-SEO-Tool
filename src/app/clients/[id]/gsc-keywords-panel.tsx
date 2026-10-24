import { Search, TrendingDown, TrendingUp } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getGscTopQueries } from "@/lib/google-data";

export async function GscKeywordsPanel({ siteUrl }: { siteUrl: string }) {
  const rows = await getGscTopQueries({ siteUrl, days: 28, limit: 15 });
  const t = await getTranslations("clientPage.gscKeywords");
  const locale = await getLocale();

  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="relative flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Search className="size-4 text-violet-300" />
            {t("title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                <th className="px-5 py-2.5 text-left">{t("query")}</th>
                <th className="px-3 py-2.5 text-right">{t("clicks")}</th>
                <th className="px-3 py-2.5 text-right">{t("impressions")}</th>
                <th className="px-3 py-2.5 text-right">{t("ctr")}</th>
                <th className="px-5 py-2.5 text-right">{t("position")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.query}
                  className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-2.5 font-medium">{r.query}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {r.clicks.toLocaleString(locale)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {r.impressions.toLocaleString(locale)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {(r.ctr * 100).toFixed(1)}%
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <PositionPill position={r.position} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PositionPill({ position }: { position: number }) {
  const rounded = position.toFixed(1);
  const tone =
    position <= 3
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : position <= 10
        ? "bg-violet-500/15 text-violet-300 ring-violet-500/30"
        : "bg-white/5 text-muted-foreground ring-white/10";
  const Icon = position <= 10 ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium tabular-nums ring-1 ring-inset ${tone}`}
    >
      <Icon className="size-3" />
      {rounded}
    </span>
  );
}
