/**
 * The publishing side of the content studio: the calendar, the automatic
 * spread of dates, and how published articles are doing in search.
 *
 * Pure: no database, no network. The pages gather the rows.
 */
import { buildSchedule } from "./seo/schedule";

export type PlanPost = {
  id: number;
  title: string;
  status: "idea" | "outline_approved" | "draft" | "scheduled" | "published";
  publishDate: Date | null;
};

/** "2026-11" for a date, in UTC like the stored publish dates. */
export const monthKey = (d: Date) => d.toISOString().slice(0, 7);
/** "2026-11-12", the value of an <input type="date">. */
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export type CalendarMonth<P> = { month: string; posts: P[] };

/**
 * The calendar: dated articles grouped by month, earliest first, and the
 * ones with no date yet set apart. Published articles keep their place:
 * the calendar is also the record of what went out.
 */
export function buildCalendar<P extends PlanPost>(posts: readonly P[]): {
  months: CalendarMonth<P>[];
  undated: P[];
} {
  const dated = posts
    .filter((p): p is P & { publishDate: Date } => p.publishDate !== null)
    .sort((a, b) => a.publishDate.getTime() - b.publishDate.getTime());
  const months: CalendarMonth<P>[] = [];
  for (const p of dated) {
    const key = monthKey(p.publishDate);
    const last = months[months.length - 1];
    if (last && last.month === key) last.posts.push(p);
    else months.push({ month: key, posts: [p] });
  }
  return { months, undated: posts.filter((p) => p.publishDate === null && p.status !== "published") };
}

/**
 * Dates for the articles that have none, on the best days for the
 * project's niche (seo/schedule.ts), skipping days already taken by a
 * dated article. Drafts go first: they are the closest to ready.
 */
export function planDates(
  posts: readonly PlanPost[],
  opts: { niche: string | null; now: Date },
): { id: number; date: Date }[] {
  const order: Record<PlanPost["status"], number> = {
    scheduled: 0,
    draft: 0,
    outline_approved: 1,
    idea: 2,
    published: 3,
  };
  const todo = posts
    .filter((p) => p.publishDate === null && p.status !== "published")
    .sort((a, b) => order[a.status] - order[b.status]);
  if (todo.length === 0) return [];
  const taken = new Set(
    posts.filter((p) => p.publishDate && p.publishDate >= opts.now).map((p) => dayKey(p.publishDate!)),
  );

  // Ask for more slots than needed, then drop the days already taken.
  const slots = buildSchedule({
    niche: opts.niche ?? undefined,
    startDate: new Date(opts.now),
    posts: Array.from({ length: todo.length + taken.size }, (_, i) => ({ id: String(i), title: "" })),
  })
    .map((s) => new Date(s.publishDateISO))
    .filter((d) => !taken.has(dayKey(d)));
  return todo.slice(0, slots.length).map((p, i) => ({ id: p.id, date: slots[i] }));
}

/** The status a post takes when its date is set or cleared. */
export function statusForDate(status: PlanPost["status"], hasDate: boolean): PlanPost["status"] {
  if (status === "draft" && hasDate) return "scheduled";
  if (status === "scheduled" && !hasDate) return "draft";
  return status;
}

export type PagePerformance = { page: string; clicks: number; impressions: number; position: number };

/** Same page whatever the protocol, www, trailing slash, query or hash. */
export function pageKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Search Console figures for each published article, matched on its URL.
 * Null for an article Search Console has no row for: not seen yet is not
 * the same as zero.
 */
export function matchPerformance<P extends { publishedUrl: string | null }>(
  posts: readonly P[],
  rows: readonly PagePerformance[],
): { post: P; perf: PagePerformance | null }[] {
  const byPage = new Map<string, PagePerformance>();
  for (const r of rows) {
    const key = pageKey(r.page);
    const prev = byPage.get(key);
    // http/https or www variants of one page: add them up.
    byPage.set(
      key,
      prev
        ? {
            page: prev.page,
            clicks: prev.clicks + r.clicks,
            impressions: prev.impressions + r.impressions,
            position:
              prev.impressions + r.impressions > 0
                ? (prev.position * prev.impressions + r.position * r.impressions) /
                  (prev.impressions + r.impressions)
                : r.position,
          }
        : r,
    );
  }
  return posts.map((post) => ({
    post,
    perf: post.publishedUrl ? (byPage.get(pageKey(post.publishedUrl)) ?? null) : null,
  }));
}
