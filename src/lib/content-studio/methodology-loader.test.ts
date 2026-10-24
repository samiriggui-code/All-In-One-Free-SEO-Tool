import { describe, it, expect } from "vitest";
import { loadMethodologies, getMethodology, methodologyAsPrompt } from "@/lib/content-studio/methodologies/loader";

describe("methodology loader", () => {
  it("loads bundled methodologies", () => {
    const all = loadMethodologies();
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(all.find((m) => m.id === "eeat-checklist")).toBeDefined();
    expect(all.find((m) => m.id === "serp-intent-classification")).toBeDefined();
    expect(all.find((m) => m.id === "skyscraper-technique")).toBeDefined();
  });
  it("retrieves by id", () => {
    const m = getMethodology("serp-intent-classification");
    expect(m).toBeDefined();
    expect(m!.title).toBeTruthy();
    expect(m!.body.length).toBeGreaterThan(50);
    expect(m!.source).toContain("Google");
  });
  it("formats as prompt", () => {
    const p = methodologyAsPrompt("eeat-checklist");
    expect(p).toContain("# Methodology:");
    expect(p).toContain("Experience");
  });
  it("throws for unknown id", () => {
    expect(() => methodologyAsPrompt("nope")).toThrow();
  });
});

describe("methodologies.generated.ts", () => {
  it("matches the .md sources (run `pnpm gen:methodologies` if this fails)", async () => {
    const { readFileSync } = await import("node:fs");
    const gen = await import("../../../scripts/gen-content-methodologies.mjs");
    expect(readFileSync(gen.GENERATED_FILE, "utf8")).toBe(gen.renderGenerated());
  });
});
