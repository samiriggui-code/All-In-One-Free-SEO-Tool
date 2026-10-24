import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const MIN_LENGTH4 = 10;
export const MAX_LENGTH3 = 70;
export const contentLengthRule = defineRule({
  id: "content-heading-length",
  name: "Heading Content Length",
  description: `Checks that headings are between ${MIN_LENGTH4} and ${MAX_LENGTH3} characters`,
  category: "content",
  weight: 1,
  run: async (context) => {
    const { $ } = context;
    type HeadingInfo = { level: number; text: string; length: number; issue?: "too-short" | "too-long" };
    const headingsInfo: HeadingInfo[] = [];
    const issues: HeadingInfo[] = [];
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      const tagName = el.tagName?.toLowerCase() || "";
      const level = parseInt(tagName.replace("h", ""), 10);
      const text = $(el).text().trim();
      const length = text.length;
      const info: HeadingInfo = { level, text, length };
      if (length < MIN_LENGTH4 && length > 0) {
        info.issue = "too-short";
        issues.push(info);
      } else if (length > MAX_LENGTH3) {
        info.issue = "too-long";
        issues.push(info);
      }
      headingsInfo.push(info);
    });
    if (headingsInfo.length === 0) {
      return pass("content-heading-length", "No headings found to check", {
        headingCount: 0
      });
    }
    if (issues.length > 0) {
      const tooShort = issues.filter((i) => i.issue === "too-short").length;
      const tooLong = issues.filter((i) => i.issue === "too-long").length;
      const messageParts: string[] = [];
      if (tooShort > 0) {
        messageParts.push(`${tooShort} too short (<${MIN_LENGTH4} chars)`);
      }
      if (tooLong > 0) {
        messageParts.push(`${tooLong} too long (>${MAX_LENGTH3} chars)`);
      }
      return warn(
        "content-heading-length",
        `Heading length issues: ${messageParts.join(", ")}`,
        {
          headingCount: headingsInfo.length,
          issueCount: issues.length,
          tooShort,
          tooLong,
          issues: issues.map((i) => ({
            level: i.level,
            text: i.text.substring(0, 80) + (i.text.length > 80 ? "..." : ""),
            length: i.length,
            issue: i.issue
          })),
          minLength: MIN_LENGTH4,
          maxLength: MAX_LENGTH3
        }
      );
    }
    return pass(
      "content-heading-length",
      `All ${headingsInfo.length} headings have appropriate length`,
      {
        headingCount: headingsInfo.length,
        minLength: MIN_LENGTH4,
        maxLength: MAX_LENGTH3
      }
    );
  }
});
