import { getTranslations } from "next-intl/server";
import { CheckCircle2, CircleDashed, Loader2, TriangleAlert } from "lucide-react";
import { schedulerStatus } from "@/lib/scheduler";
import { shortAgoDays, shortEvery } from "@/lib/relative-time";

/**
 * Live state of every background runner.
 *
 * Worth showing because "is the automation actually running?" was
 * previously unanswerable: the runners fired from a dashboard page
 * render, so they only ran when someone was looking, and there was
 * nothing to check. A user whose scheduled reports stopped arriving had
 * no way to tell whether the feature was broken, misconfigured, or
 * simply never triggered.
 */
export async function SchedulerStatusPanel() {
  const tx = await getTranslations("ui.app_automations_overview_scheduler-status");
  const tTime = await getTranslations("time");
  const tJobs = await getTranslations("schedulerJobs");
  const now = Date.now();
  let rows: Awaited<ReturnType<typeof schedulerStatus>> = [];
  try {
    rows = await schedulerStatus();
  } catch {
    return null;
  }

  const anyNeverRun = rows.some((r) => r.lastFinishedAt === null);

  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-3">
        <h2 className="text-sm font-semibold">{tx("backgroundScheduler")}</h2>
        <p className="text-[11px] text-muted-foreground">
          {tx("theseRunOnATimer")}
          {anyNeverRun &&
            tx("anythingShowingNeverWillRun")}
        </p>
      </header>

      <ul className="divide-y divide-white/[0.06]">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              {r.lastError ? (
                <TriangleAlert className="size-4 shrink-0 text-rose-300" />
              ) : r.running ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-cyan-300" />
              ) : r.lastFinishedAt ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
              ) : (
                <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                <span className="block truncate">{tJobs.has(r.id) ? tJobs(r.id) : r.label}</span>
                {r.lastError ? (
                  <span className="block truncate text-[11px] text-rose-300/80">
                    {r.lastError}
                  </span>
                ) : (
                  r.lastNote && (
                    // What the run did, not just that it happened. A
                    // green tick against "finished 4h ago" is what let
                    // the sweep report success for months while reaching
                    // nothing.
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {r.lastNote}
                    </span>
                  )
                )}
              </span>
            </span>
            <span className="shrink-0 text-right text-[11px] text-muted-foreground">
              <span className="block">
                {r.running
                  ? tTime("runningNow")
                  : r.lastFinishedAt
                    ? shortAgoDays(now - r.lastFinishedAt, tTime)
                    : tTime("never")}
              </span>
              <span className="block opacity-60">{shortEvery(r.everyMs, tTime)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
