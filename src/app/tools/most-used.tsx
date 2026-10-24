import Link from "next/link";
import { History, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { recentTools, topToolsByUsage } from "@/lib/tool-runs";

type HubT = Awaited<ReturnType<typeof getTranslations>>;

function ago(t: HubT, d: Date | null): string {
  if (!d) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minutesAgo", { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("hoursAgo", { count: hours });
  return t("daysAgo", { count: Math.round(hours / 24) });
}

function Rail({
  t,
  title,
  hint,
  icon: Icon,
  items,
}: {
  t: HubT;
  title: string;
  hint: string;
  icon: typeof Wrench;
  items: { toolId: string; label: string; runs: number; lastRunAt: Date | null }[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="flex items-baseline gap-2 border-b border-white/[0.06] px-5 py-3">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </header>
      <ul className="flex flex-wrap gap-2 p-4">
        {items.map((item) => (
          <li key={item.toolId}>
            <Link
              href={item.toolId.startsWith("/") ? item.toolId : `/tools/${item.toolId}`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-background/50 px-3 py-1.5 text-xs transition-colors hover:border-ring/50 hover:bg-accent"
            >
              <span className="max-w-[18ch] truncate font-medium">
                {item.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {item.runs > 1 ? t("runs", { count: item.runs }) : ago(t, item.lastRunAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Usage-driven shortcuts above the full tool grid.
 *
 * /tools lists ~95 tools at identical visual weight, so a freelancer
 * who reaches for the same six every week re-finds them in a wall of
 * equals every time. Pinning exists, but it asks the user to curate
 * before it helps — and nobody curates on day one.
 *
 * Every run is already logged, so the ordering can come for free. Both
 * rails render nothing on a fresh install rather than showing an empty
 * shell, so the page is unchanged until there's real signal.
 */
export async function MostUsedTools() {
  let recent: Awaited<ReturnType<typeof recentTools>> = [];
  let top: Awaited<ReturnType<typeof topToolsByUsage>> = [];
  try {
    [recent, top] = await Promise.all([recentTools(6), topToolsByUsage(8)]);
  } catch {
    return null;
  }

  // With only a handful of runs the two rails are the same list; show
  // one until there's enough history for "most used" to say anything
  // "recent" doesn't.
  const showTop = top.length > 0 && top.some((t) => t.runs > 1);
  const t = await getTranslations("tools.ui.hub");

  return (
    <>
      <Rail
        t={t}
        title={t("recentTitle")}
        hint={t("recentHint")}
        icon={History}
        items={recent}
      />
      {showTop && (
        <Rail
          t={t}
          title={t("topTitle")}
          hint={t("topHint")}
          icon={Wrench}
          items={top}
        />
      )}
    </>
  );
}
