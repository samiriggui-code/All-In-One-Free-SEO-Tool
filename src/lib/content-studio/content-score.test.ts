import { describe, it, expect } from "vitest";
import { scoreDraft } from "@/lib/content-studio/seo/content-score";
import type { SerpPageContent } from "@/lib/content-studio/seo/serp-content";

// Real SERP pages have substantial body text; scoreDraft only counts pages
// whose body exceeds 200 chars (JS-only shells / blocked pages are excluded).
// Build a >200-char body by repeating a keyword-rich sentence.
function longBody(seed: string): string {
  return (seed + " ").repeat(12).trim(); // ~each seed >20 chars * 12 => >200
}

function makePage(url: string, body: string, wordCount: number, headings: string[] = []): SerpPageContent {
  return { url, title: url, headings, body, wordCount, fetched: true };
}

describe("scoreDraft", () => {
  it("scores 0-100 against a realistic corpus", () => {
    const pages = [
      makePage("u1", longBody("wordpress seo plugin yoast schema markup ranking"), 1500, ["What is wordpress seo", "Best plugins"]),
      makePage("u2", longBody("wordpress seo plugin rank math schema markup ranking"), 1500, ["What is wordpress seo", "Top tools"]),
      makePage("u3", longBody("wordpress seo plugin all in one schema markup ranking"), 1500, ["What is wordpress seo", "Reviews"]),
      makePage("u4", longBody("wordpress seo plugin yoast schema ranking factors"), 1500, ["wordpress seo guide"]),
      makePage("u5", longBody("wordpress seo plugin schema markup ranking guide"), 1500, [])
    ];
    const draft = `# Best WordPress SEO Plugins

## What is wordpress seo

A complete guide to wordpress seo plugin choices. We compare yoast, rank math, and all in one.
Schema markup, ranking factors, and the top plugins for 2026.

Most readers want a plugin that handles schema and helps with ranking.
`;
    const report = scoreDraft(draft, ["What is wordpress seo"], { pages, paaQuestions: [] });
    expect(report.insufficient_data).toBe(false);
    expect(report.competitor_count).toBe(5);
    expect(report.score).toBeGreaterThan(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(report.grade);
  });

  it("returns insufficient_data for an empty corpus (no fake A)", () => {
    const report = scoreDraft("hello world", [], { pages: [], paaQuestions: [] });
    expect(report.insufficient_data).toBe(true);
    expect(report.competitor_count).toBe(0);
    expect(report.score).toBe(0);
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it("returns insufficient_data when fewer than 3 pages have real bodies", () => {
    const pages = [
      makePage("u1", longBody("only one real page here"), 500, []),
      makePage("u2", "too short", 10, []) // < 200 chars → excluded
    ];
    const report = scoreDraft("some draft text", [], { pages, paaQuestions: [] });
    expect(report.insufficient_data).toBe(true);
    expect(report.competitor_count).toBe(1);
  });

  it("flags PAA coverage with a sufficient corpus", () => {
    const pages = [
      makePage("u1", longBody("topic about coverage and answers scoring"), 500, []),
      makePage("u2", longBody("topic about coverage and answers and more scoring"), 500, []),
      makePage("u3", longBody("topic about coverage and answers more details scoring"), 500, [])
    ];
    const paaQuestions = ["What is coverage?", "How does scoring work?"];
    const draftHit = `# Coverage

## What is coverage
Yes, coverage is...

## How does scoring work
Scoring works by...`;
    const report = scoreDraft(draftHit, [], { pages, paaQuestions });
    expect(report.insufficient_data).toBe(false);
    expect(report.paa_questions_covered.length).toBe(2);
  });
});
