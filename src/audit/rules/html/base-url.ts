import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const ABSOLUTE_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
export function classifyBaseHref(rawHref: string|undefined, pageUrl: string) {
  const href = (rawHref ?? "").trim();
  if (href.length === 0) {
    return { href: rawHref ?? "", reason: "empty" };
  }
  if (/\s/.test(href)) {
    return { href, reason: "malformed" };
  }
  if (ABSOLUTE_SCHEME_PATTERN.test(href) && !/^https?:\/\//i.test(href)) {
    return { href, reason: "invalid-protocol" };
  }
  try {
    new URL(href, pageUrl);
  } catch {
    return { href, reason: "malformed" };
  }
  return null;
}
export const baseUrlRule = defineRule({
  id: "htmlval-base-url",
  name: "Valid Base URL",
  description: "Checks that the document has at most one <base> element with a valid href",
  category: "htmlval",
  weight: 6,
  run: async (context) => {
    const { $ } = context;
    const baseElements = $("base");
    if (baseElements.length === 0) {
      return pass("htmlval-base-url", "No <base> element found", { count: 0 });
    }
    const hrefs: string[] = [];
    const problems: { href: string; reason: string; }[] = [];
    baseElements.each((_, el) => {
      const rawHref = $(el).attr("href");
      hrefs.push(rawHref ?? "");
      const problem = classifyBaseHref(rawHref, context.url);
      if (problem) {
        problems.push(problem);
      }
    });
    if (problems.length > 0) {
      const descriptions = problems.map(
        (p) => p.reason === "empty" ? "empty href" : `"${p.href}" (${p.reason})`
      );
      return fail(
        "htmlval-base-url",
        `<base> href is empty or malformed: ${descriptions.join(", ")}. Relative links on the page may not resolve correctly for crawlers`,
        { count: baseElements.length, hrefs, problems }
      );
    }
    if (baseElements.length > 1) {
      const distinctHrefs = [...new Set(hrefs.map((h) => h.trim()))];
      if (distinctHrefs.length > 1) {
        return fail(
          "htmlval-base-url",
          `Document has ${baseElements.length} <base> elements with different hrefs (${distinctHrefs.join(", ")}). Only one <base> element is allowed per document`,
          { count: baseElements.length, hrefs }
        );
      }
      return warn(
        "htmlval-base-url",
        `Document has ${baseElements.length} <base> elements. Only one <base> element is allowed per document`,
        { count: baseElements.length, hrefs }
      );
    }
    return pass(
      "htmlval-base-url",
      `Document has a single valid <base> element (${hrefs[0]})`,
      { count: 1, hrefs }
    );
  }
});
