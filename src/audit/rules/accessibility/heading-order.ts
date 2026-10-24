import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const headingOrderRule = defineRule({
  id: "a11y-heading-order",
  name: "Heading Order",
  description: "Checks that heading levels do not skip",
  category: "a11y",
  weight: 8,
  run: (context) => {
    const { $ } = context;
    const headings: { level: number; text: string }[] = [];
    const skips = [];
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      const tag = el.tagName?.toLowerCase() || "h1";
      const level = parseInt(tag.charAt(1), 10);
      const text = $(el).text().trim().slice(0, 50);
      headings.push({ level, text });
    });
    if (headings.length === 0) {
      return warn("a11y-heading-order", "No headings found on page", {
        recommendation: "Add heading structure for accessibility and SEO"
      });
    }
    let previousLevel = 0;
    for (let i = 0; i < headings.length; i++) {
      const { level, text } = headings[i];
      if (previousLevel === 0) {
        previousLevel = level;
        continue;
      }
      if (level > previousLevel && level - previousLevel > 1) {
        skips.push({
          from: previousLevel,
          to: level,
          text,
          position: i + 1
        });
      }
      previousLevel = level;
    }
    const firstHeadingNotH1 = headings.length > 0 && headings[0].level !== 1;
    if (skips.length === 0 && !firstHeadingNotH1) {
      return pass("a11y-heading-order", "Heading hierarchy is correct", {
        totalHeadings: headings.length,
        levels: [...new Set(headings.map((h) => `H${h.level}`))].join(", ")
      });
    }
    const issues = [];
    if (firstHeadingNotH1) {
      issues.push(`First heading is H${headings[0].level}, should be H1`);
    }
    for (const skip of skips) {
      issues.push(`H${skip.from} \u2192 H${skip.to} (skipped H${skip.from + 1}): "${skip.text}"`);
    }
    if (skips.length > 3 || skips.length > 0 && firstHeadingNotH1) {
      return fail("a11y-heading-order", `Found ${issues.length} heading hierarchy issue(s)`, {
        issues: issues.slice(0, 10),
        totalHeadings: headings.length,
        skips: skips.slice(0, 5)
      });
    }
    return warn("a11y-heading-order", `Found ${issues.length} heading hierarchy issue(s)`, {
      issues,
      totalHeadings: headings.length,
      skips
    });
  }
});
