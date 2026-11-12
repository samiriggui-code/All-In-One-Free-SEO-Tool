import { describe, expect, it } from "vitest";
import { buildClientToolGroups } from "@/app/clients/[id]/client-tools-launcher";
import { allFeaturedKeys, FEATURED_MAX, featuredToolKeys, toolKey } from "./project-tools";

const PROJECT = {
  id: 42,
  url: "https://example.com",
  gscProperty: null,
  gbpUrl: null,
  ga4PropertyId: null,
  wpEndpoint: null,
};

const railKeys = new Set(
  buildClientToolGroups(PROJECT).flatMap((g) => g.tools.map((t) => toolKey(t.href, PROJECT.id))),
);

describe("toolKey", () => {
  it("drops the query and names the project id", () => {
    expect(toolKey("/content/c/42", 42)).toBe("/content/c/:id");
    expect(toolKey("/tools/health-check?url=x&clientId=42", 42)).toBe("/tools/health-check");
    expect(toolKey("/clients/42/onboarding#top", 42)).toBe("/clients/:id/onboarding");
  });

  it("only replaces a whole segment", () => {
    expect(toolKey("/tools/420", 42)).toBe("/tools/420");
  });
});

describe("featuredToolKeys", () => {
  it("names only tools the rail has", () => {
    const missing = allFeaturedKeys().filter((k) => !railKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("starts with the audit when nothing is sold yet", () => {
    const keys = featuredToolKeys("overview", []);
    expect(keys[0]).toBe("/audits/c/:id");
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });

  it("follows the mission", () => {
    expect(featuredToolKeys("overview", [{ kind: "monitoring", status: "active" }])[0]).toBe("/keywords/c/:id");
    expect(featuredToolKeys("overview", [{ kind: "redesign", status: "proposed" }])).toContain("/tools/render");
  });

  it("ignores paused, done and cancelled missions", () => {
    const keys = featuredToolKeys("overview", [
      { kind: "full", status: "done" },
      { kind: "redesign", status: "cancelled" },
      { kind: "monitoring", status: "paused" },
    ]);
    expect(keys).toEqual(featuredToolKeys("overview", []));
  });

  it("gives every mission its first tool before anyone's third, without repeats", () => {
    const keys = featuredToolKeys("overview", [
      { kind: "redesign", status: "active" },
      { kind: "monitoring", status: "active" },
    ]);
    expect(keys.slice(0, 2)).toEqual(["/audits/c/:id", "/keywords/c/:id"]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never puts forward more than five, whatever the missions", () => {
    const all = (["audit", "monitoring", "full", "redesign", "other"] as const).map((kind) => ({
      kind,
      status: "active" as const,
    }));
    expect(featuredToolKeys("overview", all)).toHaveLength(FEATURED_MAX);
  });

  it("picks by tab outside the overview", () => {
    expect(featuredToolKeys("settings", [{ kind: "full", status: "active" }])).toContain("/tools/robots");
    expect(featuredToolKeys("missions", [])[0]).toBe("/audits/c/:id");
  });
});
