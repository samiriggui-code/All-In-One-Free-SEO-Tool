import { describe, expect, it } from "vitest";
import { buildRedesignSpec, pathOf, redirectPages, targetScore, type SpecInput } from "./redesign-spec";

const base: SpecInput = {
  project: { name: "Site", url: "https://site.fr" },
  mission: { title: "Refonte", targetStack: "Next.js", notes: null },
  audit: { id: 1, at: new Date(2026, 10, 1), mode: "full", score: 62, pagesCrawled: 3 },
  categories: [
    { id: "core", score: 90 },
    { id: "perf", score: 40 },
    { id: "security", score: 70 },
  ],
  pages: ["https://site.fr/b", "https://site.fr/", "https://site.fr/b", ""],
  cwv: { lcp: 3200, cls: 0.05, inp: null },
  issues: [
    { type: "missing_meta_description", severity: "medium", url: "https://site.fr/" },
    { type: "missing_meta_description", severity: "high", url: "https://site.fr/b" },
    { type: "no_https", severity: "critical", url: "https://site.fr/" },
    { type: "missing_lang", severity: "low", url: "https://site.fr/" },
  ],
};

describe("buildRedesignSpec", () => {
  const spec = buildRedesignSpec(base);

  it("lists the problems by severity, worst first, one entry per type", () => {
    expect(spec.mustFix.map((m) => [m.type, m.severity, m.pageCount])).toEqual([
      ["no_https", "critical", 1],
      ["missing_meta_description", "high", 2],
    ]);
  });

  it("flags the requirements the audit found broken, and only those", () => {
    const failing = spec.requirements.filter((r) => r.failing).map((r) => r.id);
    expect(failing).toEqual(["https", "descriptions"]);
    // Low findings are not a must-fix, so the language requirement stays standard.
    expect(spec.requirements.find((r) => r.id === "language")?.failing).toBe(false);
  });

  it("keeps every page once, and the weak categories worst first", () => {
    expect(spec.pages).toEqual(["https://site.fr/", "https://site.fr/b"]);
    expect(spec.weakCategories.map((c) => c.id)).toEqual(["perf", "security"]);
  });

  it("compares the vitals with the good thresholds", () => {
    expect(spec.cwv).toEqual([
      { metric: "lcp", current: 3200, target: 2500, ok: false },
      { metric: "cls", current: 0.05, target: 0.1, ok: true },
      { metric: "inp", current: null, target: 200, ok: null },
    ]);
  });
});

describe("helpers", () => {
  it("aims at 80, or ten points above the current score", () => {
    expect(targetScore(null)).toBe(80);
    expect(targetScore(62)).toBe(80);
    expect(targetScore(85)).toBe(95);
    expect(targetScore(97)).toBe(100);
  });

  it("reads a path", () => {
    expect(pathOf("https://site.fr/")).toBe("/");
    expect(pathOf("https://site.fr/a?x=1")).toBe("/a?x=1");
    expect(pathOf("pas une url")).toBe("pas une url");
  });
});

describe("redirectPages", () => {
  it("lists each page once and leaves out robots.txt and sitemaps", () => {
    expect(
      redirectPages([
        "https://site.fr",
        "https://site.fr/",
        "https://site.fr/contact/",
        "https://site.fr/contact",
        "https://site.fr/robots.txt",
        "https://site.fr/sitemap_index.xml",
        "https://site.fr/a?page=2",
      ]),
    ).toEqual(["https://site.fr", "https://site.fr/a?page=2", "https://site.fr/contact/"]);
  });
});
