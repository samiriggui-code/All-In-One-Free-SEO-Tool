import { describe, expect, it } from "vitest";
import { allPagesDone, mergeTaskPages, pageProgress, staggeredDueDates } from "./task-pages";

const A = "https://site.fr/";
const B = "https://site.fr/contact";
const C = "https://site.fr/blog";

describe("mergeTaskPages", () => {
  it("lists the flagged pages, open, without repeats", () => {
    expect(mergeTaskPages(null, [A, B, A], null)).toEqual([
      { url: A, done: false },
      { url: B, done: false },
    ]);
  });

  it("ticks a page the audit crawled and no longer flags", () => {
    const before = [
      { url: A, done: false },
      { url: B, done: false },
    ];
    expect(mergeTaskPages(before, [A], new Set([A, B]))).toEqual([
      { url: A, done: false },
      { url: B, done: true },
    ]);
  });

  it("leaves alone a page the audit did not crawl", () => {
    const before = [
      { url: A, done: false },
      { url: C, done: false },
    ];
    // A quick audit: only the homepage was read.
    expect(mergeTaskPages(before, [], new Set([A]))).toEqual([
      { url: A, done: true },
      { url: C, done: false },
    ]);
    // No crawl information at all: nothing is ticked.
    expect(mergeTaskPages(before, [], null)).toEqual(before);
  });

  it("reopens a page ticked by hand that the audit still flags", () => {
    expect(mergeTaskPages([{ url: B, done: true }], [B], new Set([B]))).toEqual([{ url: B, done: false }]);
  });

  it("keeps a manual tick on a page the audit did not look at", () => {
    expect(mergeTaskPages([{ url: C, done: true }], [A], new Set([A]))).toEqual([
      { url: A, done: false },
      { url: C, done: true },
    ]);
  });
});

describe("pageProgress and allPagesDone", () => {
  it("count and conclude", () => {
    const pages = [
      { url: A, done: true },
      { url: B, done: false },
    ];
    expect(pageProgress(pages)).toEqual({ done: 1, total: 2 });
    expect(allPagesDone(pages)).toBe(false);
    expect(allPagesDone(pages.map((p) => ({ ...p, done: true })))).toBe(true);
    expect(allPagesDone([])).toBe(false);
    expect(pageProgress(null)).toEqual({ done: 0, total: 0 });
  });
});

describe("staggeredDueDates", () => {
  const start = new Date("2026-11-11T09:00:00Z");
  const days = (d: Date) => Math.round((d.getTime() - start.getTime()) / 86_400_000);

  it("spreads each priority instead of stacking it on one day", () => {
    const due = staggeredDueDates(["high", "high", "high", "medium", "low", "medium"], start);
    expect(due.map(days)).toEqual([3, 5, 7, 14, 30, 18]);
  });

  it("queues behind the work already planned", () => {
    const due = staggeredDueDates(["high", "medium"], start, { high: 4, medium: 1 });
    expect(due.map(days)).toEqual([11, 18]);
  });
});
