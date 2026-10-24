import { describe, it, expect, vi } from "vitest";
import { writePost } from "@/lib/content-studio/seo/writer";
import type { Outline } from "@/lib/content-studio/seo/outline";

// Pin the no-AI path: a key in the environment would otherwise send this
// test to a real provider.
vi.mock("@/lib/content-studio/ai", async (orig) => ({
  ...(await orig<typeof import("@/lib/content-studio/ai")>()),
  contentProviders: async () => [],
}));

// /api/calendar seeds every post with a partial outline (slug/cluster/priority
// only — no h2s, no tldr_bullets). Drafting from that stub used to throw
// "outline.tldr_bullets is not iterable" inside the fallback writer, which
// surfaced as a 500 with an empty body.
const calendarStub = {
  slug: "seo-audit",
  format: "long-form-guide",
  cluster: "seo audit",
  is_pillar: true,
  word_count_target: 1500,
  priority: 1,
  rationale: "rule-based fallback"
} as unknown as Outline;

describe("writePost fallback with a partial outline", () => {
  it("does not throw when the outline has no h2s / tldr_bullets / faqs", async () => {
    // No provider keys in the test env -> the fallback path runs.
    const md = await writePost({
      outline: calendarStub,
      primary_keyword: "seo audit",
      style: { tone: "conversational", language: "en" },
      language: "en"
    });
    expect(typeof md).toBe("string");
    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain("seo audit");
  });

  it("still renders every section when the outline is complete", async () => {
    const full: Outline = {
      title: "SEO Audit Guide",
      slug: "seo-audit-guide",
      tldr_bullets: ["one", "two"],
      intro_hook: "hook",
      h2s: [{ heading: "What is it", h3s: ["Definition"], snippet_target: true }],
      faqs: [{ q: "Is it worth it?", a_target_words: 50 }],
      conclusion_cta: "Start now.",
      internal_link_topics: [],
      image_suggestions: [],
      word_count_target: 1500
    };
    const md = await writePost({
      outline: full,
      primary_keyword: "seo audit",
      style: { tone: "conversational", language: "en" },
      language: "en"
    });
    expect(md).toContain("# SEO Audit Guide");
    expect(md).toContain("## TL;DR");
    expect(md).toContain("## What is it");
    expect(md).toContain("### Definition");
    expect(md).toContain("Is it worth it?");
    expect(md).toContain("Start now.");
  });
});
