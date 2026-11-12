import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_GROUPS } from "@/components/shell/nav-items";
import { isRetired } from "./tool-categories";
import {
  DEFAULT_DISABLED,
  MISSION_CATEGORIES,
  TOOL_CATALOG,
  catalogEntry,
  isToolDisabled,
} from "./tool-catalog";

const APP = path.resolve(__dirname, "../app");
const pageExists = (href: string) => existsSync(path.join(APP, href, "page.tsx"));

/** The sidebar's own entries and the account links are not tools. */
const NOT_TOOLS = new Set([
  "/",
  "/clients",
  "/tasks",
  "/seo-chat",
  "/audits",
  "/reports",
  "/leads",
  "/welcome",
  "/settings",
  "/docs",
  "/learn",
]);

/**
 * Reference pages rather than tools: a fixed text and a list of outside
 * links. They are reached from Resources (/knowledge), which links them.
 */
const IN_RESOURCES = ["/tools/ai-citation-tactics", "/tools/external"];

describe("tool catalogue", () => {
  it("lists each tool once, in a known category, on a real page", () => {
    const hrefs = TOOL_CATALOG.map((e) => e.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const e of TOOL_CATALOG) {
      expect(MISSION_CATEGORIES).toContain(e.category);
      expect(pageExists(e.href), e.href).toBe(true);
    }
  });

  it("keeps every page the old menu listed", () => {
    const missing = NAV_GROUPS.flatMap((g) => g.items)
      .map((it) => it.href)
      .filter((h) => !NOT_TOOLS.has(h) && !catalogEntry(h));
    expect(missing).toEqual([]);
  });

  it("keeps every tool of the old /tools grid", () => {
    const grid = readFileSync(path.join(APP, "tools/tools-grid.tsx"), "utf8");
    const hrefs = [...grid.matchAll(/href: "([^"]+)",\s*icon:/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(50);
    const missing = hrefs.filter(
      (h) => !isRetired(h) && !catalogEntry(h) && !IN_RESOURCES.includes(h),
    );
    expect(missing).toEqual([]);
  });

  it("links the reference pages from Resources instead", () => {
    for (const lang of ["fr", "en"]) {
      const hub = readFileSync(path.join(APP, `knowledge/knowledge-${lang}.tsx`), "utf8");
      for (const href of IN_RESOURCES) {
        expect(catalogEntry(href), href).toBeNull();
        expect(hub, `${lang} ${href}`).toContain(`href="${href}"`);
      }
    }
  });

  it("turns off by default only tools outside SEO work or behind a paid key", () => {
    expect([...DEFAULT_DISABLED].sort()).toEqual([
      "/tools/ads-funnel",
      "/tools/image-gen",
      "/tools/programmatic-seo",
      "/tools/reputation-abuse-risk",
      "/tools/utm-attribution",
      "/tools/youtube",
      "/tools/youtube-audit",
    ]);
  });
});

describe("isToolDisabled", () => {
  const off = new Set(["/tools/geo-swot", "/agent"]);

  it("covers the tool and its per-client view, with or without a query", () => {
    expect(isToolDisabled("/tools/geo-swot", off)).toBe(true);
    expect(isToolDisabled("/tools/geo-swot/c/4", off)).toBe(true);
    expect(isToolDisabled("/tools/geo-swot?clientId=4", off)).toBe(true);
  });

  it("leaves other tools alone", () => {
    expect(isToolDisabled("/agent/autopilot", off)).toBe(false);
    expect(isToolDisabled("/tools/geo-score", off)).toBe(false);
    expect(isToolDisabled("/tools/geo-swot", new Set())).toBe(false);
  });
});
