import { describe, expect, it } from "vitest";
import { groupIssuesByRule, type ReportIssue } from "./report-issue-groups";

const issue = (type: string, url: string, message = "Missing alt text"): ReportIssue => ({
  severity: "medium",
  type,
  url,
  message,
});

describe("groupIssuesByRule", () => {
  it("prints a rule once, however many pages break it", () => {
    const issues = Array.from({ length: 75 }, (_, n) => issue("img_alt", `https://x.fr/p${n}`));
    const { groups, hiddenGroups } = groupIssuesByRule(issues, { maxGroups: Infinity, maxRows: 10 });
    expect(groups).toHaveLength(1);
    expect(hiddenGroups).toBe(0);
    expect(groups[0]).toMatchObject({ type: "img_alt", count: 75, pageCount: 75, message: "Missing alt text", hidden: 65 });
    expect(groups[0].rows).toHaveLength(10);
    expect(groups[0].rows[0]).toEqual({ url: "https://x.fr/p0", detail: null });
  });

  it("keeps each page's own detail when the messages differ", () => {
    const { groups } = groupIssuesByRule(
      [issue("title_length", "https://x.fr/a", "Title is 82 characters"), issue("title_length", "https://x.fr/b", "Title is 12 characters")],
      { maxGroups: Infinity, maxRows: Infinity },
    );
    expect(groups[0].message).toBeNull();
    expect(groups[0].rows).toEqual([
      { url: "https://x.fr/a", detail: "Title is 82 characters" },
      { url: "https://x.fr/b", detail: "Title is 12 characters" },
    ]);
  });

  it("puts the rules found on the most pages first, and keeps the audit's order on ties", () => {
    const { groups } = groupIssuesByRule(
      [issue("a", "https://x.fr/1"), issue("b", "https://x.fr/1"), issue("c", "https://x.fr/1"), issue("c", "https://x.fr/2")],
      { maxGroups: Infinity, maxRows: Infinity },
    );
    expect(groups.map((g) => g.type)).toEqual(["c", "a", "b"]);
  });

  it("drops exact repeats of a page and counts pages, not rows", () => {
    const { groups } = groupIssuesByRule(
      [issue("a", "https://x.fr/1"), issue("a", "https://x.fr/1"), issue("a", "https://x.fr/2")],
      { maxGroups: Infinity, maxRows: Infinity },
    );
    expect(groups[0]).toMatchObject({ count: 3, pageCount: 2, hidden: 0 });
    expect(groups[0].rows).toHaveLength(2);
  });

  it("caps the rules shown and says how many are left out", () => {
    const { groups, hiddenGroups } = groupIssuesByRule(
      [issue("a", "u1"), issue("b", "u1"), issue("c", "u1")],
      { maxGroups: 2, maxRows: Infinity },
    );
    expect(groups).toHaveLength(2);
    expect(hiddenGroups).toBe(1);
  });
});
