import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const hierarchyRule = defineRule({
  id: "content-heading-hierarchy",
  name: "Heading Hierarchy",
  description: "Checks that headings follow proper hierarchy (h1 before h2 before h3) with no skipped levels",
  category: "content",
  weight: 1,
  run: async (context) => {
    const { $ } = context;
    const headings: { level: number; text: string; index: number }[] = [];
    $("h1, h2, h3, h4, h5, h6").each((index, el) => {
      const tagName = el.tagName?.toLowerCase() || "";
      const level = parseInt(tagName.replace("h", ""), 10);
      const text = $(el).text().trim();
      headings.push({ level, text, index });
    });
    if (headings.length === 0) {
      return fail("content-heading-hierarchy", "No headings found in the document", {
        headingCount: 0
      });
    }
    const issues = [];
    if (headings[0].level !== 1) {
      issues.push(
        `Document should start with an <h1>, but starts with <h${headings[0].level}>`
      );
    }
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];
      if (current.level > previous.level) {
        const skip = current.level - previous.level;
        if (skip > 1) {
          issues.push(
            `Skipped heading level: <h${previous.level}> followed by <h${current.level}> (missing h${previous.level + 1})`
          );
        }
      }
    }
    const headingStructure = headings.map((h) => ({
      level: h.level,
      text: h.text.substring(0, 50) + (h.text.length > 50 ? "..." : "")
    }));
    if (issues.length > 0) {
      return warn(
        "content-heading-hierarchy",
        `Heading hierarchy issues found: ${issues.length} problem(s)`,
        {
          issues,
          headingCount: headings.length,
          structure: headingStructure
        }
      );
    }
    return pass(
      "content-heading-hierarchy",
      "Heading hierarchy is correct",
      {
        headingCount: headings.length,
        structure: headingStructure
      }
    );
  }
});
