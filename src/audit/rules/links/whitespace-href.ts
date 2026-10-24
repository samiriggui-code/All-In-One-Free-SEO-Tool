import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const whitespaceHrefRule = defineRule({
  id: "links-whitespace-href",
  name: "No Whitespace in Hrefs",
  description: "Checks for links with whitespace-only or leading/trailing whitespace in href attributes",
  category: "links",
  weight: 4,
  run: (context) => {
    const { $ } = context;
    const whitespaceOnly: string[] = [];
    const untrimmed: { href: string; text: string; }[] = [];
    $("a[href]").each((_i, el) => {
      const node = $(el);
      const href = node.attr("href");
      if (href === void 0 || href === null) return;
      if (/^\s+$/.test(href)) {
        whitespaceOnly.push(
          node.text().trim().slice(0, 80) || "[no text]"
        );
        return;
      }
      if (href.length > 0 && href.trim() !== href) {
        untrimmed.push({
          href: href.slice(0, 100),
          text: node.text().trim().slice(0, 80) || "[no text]"
        });
      }
    });
    const totalIssues = whitespaceOnly.length + untrimmed.length;
    if (totalIssues > 0) {
      return warn(
        "links-whitespace-href",
        `Found ${totalIssues} link(s) with whitespace issues in href attributes`,
        {
          totalIssues,
          whitespaceOnlyCount: whitespaceOnly.length,
          untrimmedCount: untrimmed.length,
          whitespaceOnlyLinks: whitespaceOnly.slice(0, 5),
          untrimmedLinks: untrimmed.slice(0, 5),
          recommendation: "Trim whitespace from href attributes and replace whitespace-only hrefs with valid URLs"
        }
      );
    }
    return pass(
      "links-whitespace-href",
      "All link hrefs are free of whitespace issues"
    );
  }
});
