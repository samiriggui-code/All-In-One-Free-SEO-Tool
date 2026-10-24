import { describe, it, expect } from "vitest";
import { DOCS_HOME, docsUrlFor, mappedDocsPages } from "./docs-links";
import { DOC_GUIDES } from "./docs-guides";

/**
 * The help button is on almost every screen. A link that 404s from there
 * is worse than no link: it is offered at the exact moment someone is
 * already stuck, and it teaches them the docs are not worth trying.
 *
 * So every guide the map can produce has to exist in docs-guides.ts.
 */

describe("documentation links", () => {
  const slugs = new Set(DOC_GUIDES.map((g) => g.slug));

  it("every page in the map is the docs home or a guide that exists", () => {
    for (const page of mappedDocsPages()) {
      const [path] = page.split("#");
      if (path === DOCS_HOME) continue;
      const slug = path.replace(`${DOCS_HOME}/`, "");
      expect(slugs.has(slug), `${page} is not a guide`).toBe(true);
    }
  });

  it("stays inside the app", () => {
    for (const page of mappedDocsPages()) expect(page.startsWith(DOCS_HOME)).toBe(true);
    expect(docsUrlFor("/content/c/1")).toBe("/docs/write-article");
  });

  it("sends an unknown screen to the docs home rather than nowhere", () => {
    expect(docsUrlFor("/something/nobody/added")).toBe(DOCS_HOME);
    expect(docsUrlFor("/")).toBe(DOCS_HOME);
    expect(docsUrlFor(null)).toBe(DOCS_HOME);
  });

  it("points a single tool at its own entry in the reference", () => {
    expect(docsUrlFor("/tools/health-check")).toBe("/docs#health-check");
    expect(docsUrlFor("/tools")).toBe("/docs#tools");
  });

  it("picks the most specific match, not the first", () => {
    expect(docsUrlFor("/settings/backup")).toBe("/docs/update-backup");
    expect(docsUrlFor("/settings")).toBe("/docs/connect-ai");
  });

  it("handles a trailing slash and a query string", () => {
    expect(docsUrlFor("/audits/")).toBe(docsUrlFor("/audits"));
    expect(docsUrlFor("/audits?id=3")).toBe(docsUrlFor("/audits"));
  });

  it("nested client routes inherit their section's page", () => {
    expect(docsUrlFor("/audits/c/4")).toBe(docsUrlFor("/audits"));
    expect(docsUrlFor("/clients/12/onboarding")).toBe(docsUrlFor("/clients"));
  });
});
