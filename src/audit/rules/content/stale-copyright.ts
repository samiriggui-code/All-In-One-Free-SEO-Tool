import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const COPYRIGHT = /(?:©|\(c\)|copyright)\s*(\d{4})(?:\s*[-–—]\s*(\d{4}))?/gi;
export const staleCopyrightRule = defineRule({
  id: "content-stale-copyright",
  name: "Stale Copyright Year",
  description: "Checks the footer copyright year against the current year",
  category: "content",
  weight: 2,
  run: (context) => {
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const footer = context.$('footer, [role="contentinfo"]').text();
    const years = [];
    for (const match of footer.matchAll(COPYRIGHT)) {
      years.push(Number(match[2] ?? match[1]));
    }
    if (years.length === 0) {
      return pass("content-stale-copyright", "No footer copyright year to compare", {
        currentYear,
        years: []
      });
    }
    const stale = years.filter((year) => year < currentYear);
    if (stale.length === 0) {
      return pass("content-stale-copyright", `Footer copyright year is current (${currentYear})`, {
        currentYear,
        years
      });
    }
    return warn(
      "content-stale-copyright",
      `Footer copyright year ${stale.join(", ")} is behind ${currentYear}`,
      {
        currentYear,
        years,
        recommendation: `Update the footer copyright to ${currentYear}.`
      }
    );
  }
});
