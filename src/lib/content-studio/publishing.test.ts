import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  dayKey,
  matchPerformance,
  pageKey,
  planDates,
  statusForDate,
  type PlanPost,
} from "./publishing";

const post = (id: number, status: PlanPost["status"], date: string | null = null): PlanPost => ({
  id,
  title: `Article ${id}`,
  status,
  publishDate: date ? new Date(`${date}T09:00:00Z`) : null,
});

describe("buildCalendar", () => {
  it("groups dated articles by month, earliest first, and sets the undated apart", () => {
    const cal = buildCalendar([
      post(1, "scheduled", "2026-12-03"),
      post(2, "draft"),
      post(3, "published", "2026-11-20"),
      post(4, "scheduled", "2026-11-24"),
      post(5, "published"),
    ]);
    expect(cal.months.map((m) => [m.month, m.posts.map((p) => p.id)])).toEqual([
      ["2026-11", [3, 4]],
      ["2026-12", [1]],
    ]);
    // A published article with no date is not waiting for one.
    expect(cal.undated.map((p) => p.id)).toEqual([2]);
  });
});

describe("planDates", () => {
  const now = new Date("2026-11-12T10:00:00Z"); // a Thursday

  it("gives each undated article its own day, drafts first", () => {
    const plan = planDates([post(1, "idea"), post(2, "draft"), post(3, "published"), post(4, "outline_approved")], {
      niche: null,
      now,
    });
    expect(plan.map((p) => p.id)).toEqual([2, 4, 1]);
    const days = plan.map((p) => dayKey(p.date));
    expect(new Set(days).size).toBe(3);
    // Default niche: Tuesdays and Thursdays, never before two days out.
    for (const p of plan) {
      expect([2, 4]).toContain(p.date.getUTCDay());
      expect(p.date.getTime()).toBeGreaterThan(now.getTime() + 24 * 3600 * 1000);
    }
    expect(days).toEqual([...days].sort());
  });

  it("skips the days already taken and leaves dated articles alone", () => {
    const first = planDates([post(1, "draft")], { niche: null, now })[0].date;
    const plan = planDates([post(1, "draft"), post(2, "scheduled", dayKey(first))], { niche: null, now });
    expect(plan).toHaveLength(1);
    expect(plan[0].id).toBe(1);
    expect(dayKey(plan[0].date)).not.toBe(dayKey(first));
  });

  it("does not move the clock it was given, and returns nothing when nothing waits", () => {
    const before = now.getTime();
    expect(planDates([post(1, "published"), post(2, "scheduled", "2026-12-01")], { niche: "saas", now })).toEqual([]);
    planDates([post(1, "draft")], { niche: "saas", now });
    expect(now.getTime()).toBe(before);
  });
});

describe("statusForDate", () => {
  it("a dated draft is scheduled, an undated scheduled article is a draft again", () => {
    expect(statusForDate("draft", true)).toBe("scheduled");
    expect(statusForDate("scheduled", false)).toBe("draft");
    expect(statusForDate("idea", true)).toBe("idea");
    expect(statusForDate("published", false)).toBe("published");
  });
});

describe("matchPerformance", () => {
  it("matches an article to its page whatever the protocol, www or trailing slash", () => {
    expect(pageKey("https://www.Site.fr/blog/article/?utm=x#top")).toBe("site.fr/blog/article");
    expect(pageKey("http://site.fr")).toBe("site.fr/");
    const out = matchPerformance(
      [
        { id: 1, publishedUrl: "https://site.fr/blog/a/" },
        { id: 2, publishedUrl: "https://site.fr/blog/b" },
        { id: 3, publishedUrl: null },
      ],
      [
        { page: "https://www.site.fr/blog/a", clicks: 10, impressions: 100, position: 4 },
        { page: "http://site.fr/blog/a", clicks: 2, impressions: 100, position: 8 },
      ],
    );
    expect(out[0].perf).toMatchObject({ clicks: 12, impressions: 200, position: 6 });
    // No row is not zero clicks.
    expect(out[1].perf).toBeNull();
    expect(out[2].perf).toBeNull();
  });
});
