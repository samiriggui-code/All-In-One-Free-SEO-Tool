import { describe, expect, it } from "vitest";
import {
  groupCannibalization,
  projectRules,
  TOOL_RULES,
  type GscQueryPageRow,
} from "./cannibalization";

const row = (
  query: string,
  page: string,
  impressions: number,
  position: number,
  clicks = 0,
): GscQueryPageRow => ({ keys: [query, page], clicks, impressions, ctr: 0, position });

describe("groupCannibalization — tool rules", () => {
  it("keeps queries where two pages with 5+ impressions sit in the top 30", () => {
    const { groups, queriesAnalyzed } = groupCannibalization(
      [
        row("shoes", "/b", 12, 8, 3),
        row("shoes", "/a", 15, 4, 9),
        row("boots", "/a", 40, 3),
        row("boots", "/b", 4, 9), // too few impressions
        row("socks", "/a", 20, 35), // beyond position 30
        row("socks", "/b", 20, 12),
      ],
      TOOL_RULES,
    );
    expect(queriesAnalyzed).toBe(3);
    expect(groups).toHaveLength(1);
    expect(groups[0].query).toBe("shoes");
    expect(groups[0].pages.map((p) => p.page)).toEqual(["/a", "/b"]);
    expect(groups[0].totalClicks).toBe(12);
    expect(groups[0].severity).toBe("high");
  });

  it("orders by severity, then clicks at stake", () => {
    const { groups } = groupCannibalization(
      [
        row("low", "/a", 6, 3, 100),
        row("low", "/b", 6, 4, 100),
        row("mid", "/a", 20, 5, 1),
        row("mid", "/b", 20, 25, 1),
        row("high", "/a", 20, 5, 1),
        row("high", "/b", 20, 6, 1),
      ],
      TOOL_RULES,
    );
    expect(groups.map((g) => [g.query, g.severity])).toEqual([
      ["high", "high"],
      ["mid", "medium"],
      ["low", "low"],
    ]);
  });
});

describe("groupCannibalization — project rules", () => {
  it("drops rows under the impression floor, whatever their position", () => {
    const { groups } = groupCannibalization(
      [
        row("shoes", "/a", 30, 45),
        row("shoes", "/b", 31, 50),
        row("boots", "/a", 29, 2),
        row("boots", "/b", 100, 3),
      ],
      projectRules(),
    );
    expect(groups.map((g) => g.query)).toEqual(["shoes"]);
    expect(groups[0].severity).toBe("low");
  });

  it("rates three pages, or two in the top 20, as high", () => {
    const { groups } = groupCannibalization(
      [
        row("three", "/a", 50, 40),
        row("three", "/b", 50, 41),
        row("three", "/c", 50, 42),
        row("one-top", "/a", 500, 5),
        row("one-top", "/b", 500, 25),
      ],
      projectRules(),
    );
    expect(groups.map((g) => [g.query, g.severity])).toEqual([
      ["three", "high"],
      ["one-top", "medium"],
    ]);
  });

  it("honours a custom floor", () => {
    const { groups } = groupCannibalization(
      [row("q", "/a", 10, 1), row("q", "/b", 10, 2)],
      projectRules(10),
    );
    expect(groups).toHaveLength(1);
  });
});
