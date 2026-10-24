import { describe, expect, it } from "vitest";
import { outlineToText, textToOutline } from "./outline-text";
import type { Outline } from "./types";

const base: Outline = {
  title: "Pain au levain",
  slug: "pain-au-levain",
  tldr_bullets: ["Un levain actif"],
  intro_hook: "Le levain fait peur.",
  h2s: [
    { heading: "Préparer le levain", h3s: ["Farine", "Eau"], notes: "Garder court", snippet_target: true },
    { heading: "La cuisson", h3s: [] },
  ],
  faqs: [{ q: "Combien de temps ?" }],
  conclusion_cta: "À vos fours.",
  internal_link_topics: [],
  image_suggestions: [],
  word_count_target: 1500,
};

describe("outline text round trip", () => {
  it("renders sections, sub-headings and FAQ", () => {
    expect(outlineToText(base)).toBe(
      "## Préparer le levain\n### Farine\n### Eau\n## La cuisson\n## FAQ\n? Combien de temps ?",
    );
  });

  it("parses back to the same outline", () => {
    expect(textToOutline(outlineToText(base), base)).toEqual(base);
  });

  it("keeps notes on a kept heading and accepts edits", () => {
    const edited = textToOutline(
      "## La cuisson\n### Four\nPréparer le levain\n### Farine\n## FAQ\n? Quelle farine ?",
      base,
    );
    expect(edited.h2s.map((h) => h.heading)).toEqual(["La cuisson", "Préparer le levain"]);
    expect(edited.h2s[0].h3s).toEqual(["Four"]);
    expect(edited.h2s[1].notes).toBe("Garder court");
    expect(edited.faqs).toEqual([{ q: "Quelle farine ?" }]);
    expect(edited.intro_hook).toBe(base.intro_hook);
  });
});
