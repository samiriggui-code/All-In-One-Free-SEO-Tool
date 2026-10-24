import { describe, it, expect } from "vitest";
import { DOC_GUIDES, GUIDE_GROUPS, guideBySlug, guidesFor } from "./docs-guides";
import { DOC_GUIDES_FR } from "./docs-guides.fr";
import {
  TOOL_CAPABILITIES,
  capabilityOf,
  copyOf,
} from "./tool-capabilities";
import { isRetired } from "./tool-categories";

describe("docs guides", () => {
  it("French and English carry the same guides", () => {
    // A guide written in one language only would vanish for half the
    // readers, and a related link fixed in one copy would stay dead in
    // the other.
    expect(DOC_GUIDES_FR.map((g) => g.slug)).toEqual(DOC_GUIDES.map((g) => g.slug));
    for (const [i, en] of DOC_GUIDES.entries()) {
      const fr = DOC_GUIDES_FR[i];
      expect(fr.group, en.slug).toBe(en.group);
      expect(fr.related, en.slug).toEqual(en.related);
      expect(fr.steps.length, en.slug).toBe(en.steps.length);
      expect((fr.links ?? []).map((l) => l.href), en.slug).toEqual((en.links ?? []).map((l) => l.href));
    }
  });

  it("serves French by default and English on request", () => {
    expect(guidesFor("fr")).toBe(DOC_GUIDES_FR);
    expect(guidesFor("en")).toBe(DOC_GUIDES);
    expect(guideBySlug("audit", "fr")?.title).toBe(DOC_GUIDES_FR.find((g) => g.slug === "audit")?.title);
  });

  it("every related link points at a route that exists", () => {
    // A dead link in the docs is worse than a missing one: it looks like
    // the feature exists and the user goes looking for it.
    const dead = [...DOC_GUIDES, ...DOC_GUIDES_FR].flatMap((g) =>
      (g.related ?? []).map((href) => ({ guide: g.slug, href })),
    ).filter(({ href }) => capabilityOf(href) === null);
    expect(dead).toEqual([]);
  });

  it("slugs are unique and resolvable", () => {
    const slugs = DOC_GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(guideBySlug(s)?.slug).toBe(s);
    expect(guideBySlug("no-such-guide")).toBeNull();
  });

  it("every guide sits in a group the index renders", () => {
    // A guide in an unlisted group is written, shipped, and invisible.
    for (const g of [...DOC_GUIDES, ...DOC_GUIDES_FR]) {
      expect(GUIDE_GROUPS).toContain(g.group);
    }
  });

  it("no guide is empty or unbounded", () => {
    for (const g of [...DOC_GUIDES, ...DOC_GUIDES_FR]) {
      expect(g.steps.length, `${g.slug} has no steps`).toBeGreaterThan(0);
      expect(g.steps.length, `${g.slug} is too long to follow`).toBeLessThan(12);
      expect(g.minutes).toBeGreaterThan(0);
      for (const s of g.steps) expect(s.do.trim()).not.toBe("");
    }
  });

  it("the docs cover every tool the grid shows", () => {
    // The reference list is built from the generated table, so this
    // fails when a tool is added to the grid without copy the parser can
    // read — which is how a tool would silently go undocumented.
    const undocumented = TOOL_CAPABILITIES.filter(
      (c) =>
        /^\/tools\/[^/]+$/.test(c.route) &&
        !isRetired(c.route) &&
        !copyOf(capabilityOf(c.route)),
    ).map((c) => c.route);

    // Nothing is exempt any more. geo-swot used to be: it was reachable
    // only from a client page, had no card in the grid, and so had no
    // copy for the parser to read. That was recorded here as legitimate
    // when it was really a tool nobody could find — it now has a card,
    // and the exemption went with it.
    expect(undocumented).toEqual([]);
  });

  it("external links are absolute https URLs", () => {
    // A relative or http link in a docs page is either broken or a
    // downgrade; both are worse than no link.
    const bad = [...DOC_GUIDES, ...DOC_GUIDES_FR].flatMap((g) =>
      (g.links ?? []).map((l) => ({ guide: g.slug, href: l.href })),
    ).filter(({ href }) => !href.startsWith("https://"));
    expect(bad).toEqual([]);
  });

  it("link labels are unique within a guide", () => {
    for (const g of [...DOC_GUIDES, ...DOC_GUIDES_FR]) {
      const labels = (g.links ?? []).map((l) => l.label);
      expect(new Set(labels).size, g.slug).toBe(labels.length);
    }
  });
});
