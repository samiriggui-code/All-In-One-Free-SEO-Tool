/**
 * One task per problem, with the pages it affects as sub-items.
 *
 * The audit already made one task per finding type ("Write a meta
 * description for 34 pages") but listed the pages as prose in the
 * description, and the quick-win generator made one task per page on top
 * of it: sixty tasks for one client, most of them the same job. Here the
 * pages are data on the task (tasks.pages_json), each with its own tick,
 * and the next audit keeps the list honest.
 *
 * Pure: no database, no React.
 */

export type TaskPage = { url: string; done: boolean };

/**
 * The pages of a task after an audit.
 *
 * - a page the audit flagged is open, even if somebody ticked it: the
 *   problem is still there, so the tick was premature;
 * - a page on the list that the audit crawled and did not flag is fixed:
 *   it is ticked;
 * - a page the audit did not crawl keeps its state. A quick audit only
 *   reads the homepage, and saying the other 33 pages were fixed because
 *   nobody looked at them would be the worst kind of wrong.
 *
 * Flagged pages come first, in the audit's order, then the rest.
 */
export function mergeTaskPages(
  existing: readonly TaskPage[] | null | undefined,
  flagged: readonly string[],
  crawled: ReadonlySet<string> | null,
): TaskPage[] {
  const flaggedSet = new Set(flagged);
  const out: TaskPage[] = [];
  const seen = new Set<string>();
  for (const url of flagged) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, done: false });
  }
  for (const p of existing ?? []) {
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    const fixed = !flaggedSet.has(p.url) && crawled !== null && crawled.has(p.url);
    out.push({ url: p.url, done: p.done || fixed });
  }
  return out;
}

export function pageProgress(pages: readonly TaskPage[] | null | undefined): {
  done: number;
  total: number;
} {
  const list = pages ?? [];
  return { done: list.filter((p) => p.done).length, total: list.length };
}

/** Every page ticked: the task's job is done. An empty list says nothing. */
export function allPagesDone(pages: readonly TaskPage[] | null | undefined): boolean {
  return Boolean(pages && pages.length > 0 && pages.every((p) => p.done));
}

export type Priority = "high" | "medium" | "low";

const DAY = 86_400_000;

/**
 * Due dates a person can keep.
 *
 * Every quick win used to be due tomorrow and every high-priority audit
 * task in seven days, so a new client opened on a wall of overdue work by
 * the end of the week. Here each priority has a first slot and a pace: a
 * high-priority job every two days from day three, a medium one every
 * four days from day fourteen, a low one weekly from day thirty. The
 * `alreadyPlanned` counts are the open tasks of each priority the project
 * already has, so a second audit queues behind the first instead of
 * stacking on the same days.
 */
export function staggeredDueDates(
  priorities: readonly Priority[],
  start: Date,
  alreadyPlanned: Partial<Record<Priority, number>> = {},
): Date[] {
  const plan: Record<Priority, { first: number; every: number }> = {
    high: { first: 3, every: 2 },
    medium: { first: 14, every: 4 },
    low: { first: 30, every: 7 },
  };
  const used: Record<Priority, number> = {
    high: alreadyPlanned.high ?? 0,
    medium: alreadyPlanned.medium ?? 0,
    low: alreadyPlanned.low ?? 0,
  };
  return priorities.map((p) => {
    const slot = used[p]++;
    return new Date(start.getTime() + (plan[p].first + slot * plan[p].every) * DAY);
  });
}
