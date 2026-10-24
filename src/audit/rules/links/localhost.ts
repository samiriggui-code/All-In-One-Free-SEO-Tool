import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const LOCALHOST_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0"
];
export const DEV_PORT_PATTERNS = [
  ":3000",
  ":8080",
  ":8000",
  ":4200",
  ":5173",
  ":5000"
];
export function isLocalhostUrl(href: string) {
  const lower = href.toLowerCase();
  for (const pattern of LOCALHOST_PATTERNS) {
    if (lower.includes(pattern)) return true;
  }
  for (const port of DEV_PORT_PATTERNS) {
    if (lower.includes(port)) {
      const idx = lower.indexOf(port);
      if (idx > 0) {
        const before = lower[idx - 1];
        if (/[a-z0-9.\]]/.test(before)) return true;
      } else if (idx === 0) {
        return true;
      }
    }
  }
  return false;
}
export const localhostRule = defineRule({
  id: "links-localhost",
  name: "No Localhost Links",
  description: "Checks for links pointing to localhost, 127.0.0.1, or common development server ports",
  category: "links",
  weight: 8,
  run: (context) => {
    const found: { element: string; href: string; }[] = [];
    for (const link of context.links) {
      if (isLocalhostUrl(link.href)) {
        found.push({ element: "a", href: link.href });
      }
    }
    const selector = "a[href], link[href], script[src], img[src]";
    context.$(selector).each((_i, el) => {
      const node = context.$(el);
      const href = node.attr("href") || node.attr("src") || "";
      if (!href) return;
      if (isLocalhostUrl(href)) {
        const tag = el.tagName || "unknown";
        const alreadyCaptured = found.some(
          (f) => f.href === href && f.element === tag
        );
        if (!alreadyCaptured) {
          found.push({ element: tag, href });
        }
      }
    });
    if (found.length > 0) {
      return fail(
        "links-localhost",
        `Found ${found.length} localhost/development URL reference(s)`,
        {
          localhostCount: found.length,
          localhostLinks: found.slice(0, 10),
          recommendation: "Replace localhost and development URLs with production URLs before deploying"
        }
      );
    }
    return pass(
      "links-localhost",
      "No localhost or development URL references found",
      { totalElementsChecked: context.links.length }
    );
  }
});
