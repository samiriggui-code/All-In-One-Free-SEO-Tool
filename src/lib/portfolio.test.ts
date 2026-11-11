import { describe, expect, it } from "vitest";
import {
  averageScore,
  dueIn,
  reportState,
  scoreBands,
  scoreTrend,
  todayPicks,
  weekStart,
  weeklyCounts,
} from "./portfolio";

const now = new Date(2026, 10, 11, 15, 0); // Wednesday 11 November 2026, 15:00

describe("scores", () => {
  it("bands and averages the known scores", () => {
    expect(scoreBands([30, 65, 88, 92, null])).toEqual({ weak: 1, fair: 1, good: 2 });
    expect(averageScore([80, 91, null])).toBe(86);
    expect(averageScore([null])).toBeNull();
  });

  it("reads the trend from the last two audits", () => {
    expect(scoreTrend([70, 75])).toBe("up");
    expect(scoreTrend([80, 75, 70])).toBe("down");
    expect(scoreTrend([88, 88])).toBe("flat");
    expect(scoreTrend([88])).toBeNull();
  });
});

describe("weeks", () => {
  it("starts on Monday", () => {
    expect(weekStart(now)).toEqual(new Date(2026, 10, 9));
    expect(weekStart(new Date(2026, 10, 15, 23))).toEqual(new Date(2026, 10, 9));
  });

  it("counts the last weeks, oldest first, and ignores older dates", () => {
    const counts = weeklyCounts(
      [new Date(2026, 10, 10), new Date(2026, 10, 11), new Date(2026, 10, 3), new Date(2025, 0, 1)],
      now,
      3,
    );
    expect(counts.map((c) => c.count)).toEqual([0, 1, 2]);
    expect(counts[2]!.week).toEqual(new Date(2026, 10, 9));
  });
});

describe("todayPicks", () => {
  const d = (day: number) => new Date(2026, 10, day, 9);
  it("puts late and due work first, then dated, then undated by priority", () => {
    const picks = todayPicks(
      [
        { id: 1, priority: "low", dueDate: null, status: "todo" },
        { id: 2, priority: "high", dueDate: d(20), status: "todo" },
        { id: 3, priority: "medium", dueDate: d(5), status: "todo" },
        { id: 4, priority: "high", dueDate: d(11), status: "todo" },
        { id: 5, priority: "high", dueDate: null, status: "todo" },
        { id: 6, priority: "high", dueDate: d(2), status: "done" },
      ],
      now,
      10,
    );
    // 3 is late and 4 due today: both count as today, the high one first.
    expect(picks.map((p) => p.id)).toEqual([4, 3, 2, 5, 1]);
  });

  it("keeps five at most and finishes started work first", () => {
    const list = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      priority: "medium" as const,
      dueDate: d(11),
      status: i === 6 ? "in_progress" : "todo",
    }));
    const picks = todayPicks(list, now);
    expect(picks).toHaveLength(5);
    expect(picks[0]!.id).toBe(7);
  });
});

describe("dueIn and reportState", () => {
  it("says late, today or in N days", () => {
    expect(dueIn(new Date(2026, 10, 10, 23), now)).toEqual({ kind: "late" });
    expect(dueIn(new Date(2026, 10, 11, 23), now)).toEqual({ kind: "today" });
    expect(dueIn(new Date(2026, 10, 14, 1), now)).toEqual({ kind: "days", days: 3 });
    expect(dueIn(null, now)).toEqual({ kind: "none" });
  });

  it("calls a report current for 35 days, then scheduled or due", () => {
    expect(reportState(new Date(2026, 9, 20), false, now)).toBe("current");
    expect(reportState(new Date(2026, 8, 1), true, now)).toBe("scheduled");
    expect(reportState(null, false, now)).toBe("due");
  });
});
