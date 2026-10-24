import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const SAMPLE_LIMIT = 8;
export function isInternalHref(href: string, pageUrl: string) {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("?")) return false;
  if (/^(?:mailto|tel|javascript|data):/i.test(trimmed)) return false;
  try {
    const page = new URL(pageUrl);
    const target = new URL(trimmed, page);
    if (target.protocol !== "http:" && target.protocol !== "https:") return false;
    return target.hostname === page.hostname;
  } catch {
    return false;
  }
}
export const nofollowInternalRule = defineRule({
  id: "links-nofollow-internal",
  name: "Nofollow On Internal Links",
  description: "Checks that same-host links do not carry rel=nofollow",
  category: "links",
  weight: 4,
  run: (context) => {
    const found: { href: string; text: string; }[] = [];
    context.$("a[href]").each((_, el) => {
      const node = context.$(el);
      const rel = (node.attr("rel") || "").toLowerCase().split(/\s+/);
      if (!rel.includes("nofollow")) return;
      const href = node.attr("href") || "";
      if (!isInternalHref(href, context.url)) return;
      if (found.length >= SAMPLE_LIMIT) return;
      found.push({ href, text: node.text().replace(/\s+/g, " ").trim().slice(0, 80) });
    });
    if (found.length === 0) {
      return pass("links-nofollow-internal", "No internal links carry rel=nofollow", {
        links: []
      });
    }
    return warn(
      "links-nofollow-internal",
      `${found.length} internal link(s) carry rel=nofollow`,
      {
        links: found,
        recommendation: "Remove nofollow from links to your own pages. Keep it for untrusted, sponsored, or user-generated external links."
      }
    );
  }
});
