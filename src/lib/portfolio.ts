/**
 * The agency's portfolio at a glance: the sums behind the dashboard, the
 * global Audits page and the global Reports page.
 *
 * The dashboard used to show the latest audit of whichever project was
 * audited last, a count of every audit ever run and a "latest score" that
 * belonged to nobody in particular. An agency asks other questions: how
 * are my projects doing, which one needs me, what do I do today. These
 * are the answers, as pure functions so they can be tested without a
 * database.
 */

export type Priority = "high" | "medium" | "low";

const DAY = 86_400_000;
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** The report's own colours: below 50 red, below 80 amber, else green. */
export type ScoreBand = "weak" | "fair" | "good";

export function scoreBand(score: number): ScoreBand {
  if (score < 50) return "weak";
  if (score < 80) return "fair";
  return "good";
}

/** How many projects fall in each band. Projects with no score are left out. */
export function scoreBands(scores: readonly (number | null)[]): Record<ScoreBand, number> {
  const out: Record<ScoreBand, number> = { weak: 0, fair: 0, good: 0 };
  for (const s of scores) if (s !== null) out[scoreBand(s)]++;
  return out;
}

/** Average of the known scores, rounded; null when there is none. */
export function averageScore(scores: readonly (number | null)[]): number | null {
  const known = scores.filter((s): s is number => s !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length);
}

/** Monday 00:00 (local time) of the week that contains `d`. */
export function weekStart(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (out.getDay() + 6) % 7; // Monday = 0
  out.setDate(out.getDate() - offset);
  return out;
}

/**
 * Counts per week for the last `weeks` weeks, oldest first, the current
 * week last. Dates outside the window are ignored.
 */
export function weeklyCounts(
  dates: readonly Date[],
  now: Date,
  weeks = 8,
): { week: Date; count: number }[] {
  const current = weekStart(now);
  const out = Array.from({ length: weeks }, (_, i) => {
    const week = new Date(current);
    week.setDate(week.getDate() - 7 * (weeks - 1 - i));
    return { week, count: 0 };
  });
  for (const d of dates) {
    const w = weekStart(d).getTime();
    const slot = out.find((o) => o.week.getTime() === w);
    if (slot) slot.count++;
  }
  return out;
}

/** "up" / "down" / "flat" between the last two scores; null with fewer. */
export function scoreTrend(scoresOldestFirst: readonly number[]): "up" | "down" | "flat" | null {
  if (scoresOldestFirst.length < 2) return null;
  const last = scoresOldestFirst[scoresOldestFirst.length - 1]!;
  const before = scoresOldestFirst[scoresOldestFirst.length - 2]!;
  if (last > before) return "up";
  if (last < before) return "down";
  return "flat";
}

export type OpenTask = {
  id: number;
  priority: Priority;
  dueDate: Date | null;
  status: string;
};

/**
 * What to do today, across every project: at most `limit` tasks.
 *
 * Late and due-today work first, the most urgent priority first within
 * the same day; then the next due dates; tasks with no date last, by
 * priority. Work already started comes before work not started on the
 * same day: finishing beats starting.
 */
export function todayPicks<T extends OpenTask>(list: readonly T[], now: Date, limit = 5): T[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Late work counts as today's: it is due now, not "earlier".
  const day = (t: T) =>
    t.dueDate === null
      ? Number.POSITIVE_INFINITY
      : Math.floor((Math.max(t.dueDate.getTime(), startOfToday) - startOfToday) / DAY);
  return [...list]
    .filter((t) => t.status === "todo" || t.status === "in_progress")
    .sort(
      (a, b) =>
        day(a) - day(b) ||
        (a.status === "in_progress" ? 0 : 1) - (b.status === "in_progress" ? 0 : 1) ||
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0) ||
        a.id - b.id,
    )
    .slice(0, limit);
}

/** A due date in words the page can translate: late, today, or in N days. */
export function dueIn(due: Date | null, now: Date): { kind: "none" } | { kind: "late" | "today" } | { kind: "days"; days: number } {
  if (!due) return { kind: "none" };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const days = Math.round((dueDay - today) / DAY);
  if (days < 0) return { kind: "late" };
  if (days === 0) return { kind: "today" };
  return { kind: "days", days };
}

/**
 * Where a project stands on reports: a report in the last 35 days is
 * current; a schedule that will send one is planned; anything else is a
 * report to make.
 */
export function reportState(
  lastReportAt: Date | null,
  hasSchedule: boolean,
  now: Date,
): "current" | "scheduled" | "due" {
  if (lastReportAt && now.getTime() - lastReportAt.getTime() <= 35 * DAY) return "current";
  return hasSchedule ? "scheduled" : "due";
}
