import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const RESOURCE_SELECTORS = [
  { selector: 'link[href^="//"]', attribute: "href" },
  { selector: 'script[src^="//"]', attribute: "src" },
  { selector: 'img[src^="//"]', attribute: "src" },
  { selector: 'source[src^="//"]', attribute: "src" },
  { selector: "source[srcset]", attribute: "srcset" },
  { selector: 'video[src^="//"]', attribute: "src" },
  { selector: 'audio[src^="//"]', attribute: "src" },
  { selector: 'iframe[src^="//"]', attribute: "src" },
  { selector: 'embed[src^="//"]', attribute: "src" },
  { selector: 'object[data^="//"]', attribute: "data" }
];
export const protocolRelativeRule = defineRule({
  id: "security-protocol-relative",
  name: "Protocol-Relative URLs",
  description: "Checks for protocol-relative URLs (starting with //) in resource references",
  category: "security",
  weight: 6,
  run: (context) => {
    const { $ } = context;
    const found: { tag: string; url: string; attribute: string; }[] = [];
    for (const { selector, attribute } of RESOURCE_SELECTORS) {
      $(selector).each((_, el) => {
        const tag = ("tagName" in el ? el.tagName : undefined)?.toLowerCase() || "unknown";
        const value = $(el).attr(attribute) || "";
        if (attribute === "srcset") {
          const srcsetParts = value.split(",").map((s) => s.trim());
          for (const part of srcsetParts) {
            const srcUrl = part.split(/\s+/)[0];
            if (srcUrl && srcUrl.startsWith("//")) {
              found.push({ tag, url: srcUrl, attribute: "srcset" });
            }
          }
        } else if (value.startsWith("//")) {
          found.push({ tag, url: value, attribute });
        }
      });
    }
    if (found.length === 0) {
      return pass(
        "security-protocol-relative",
        "No protocol-relative URLs found in resource references",
        { count: 0 }
      );
    }
    const byTag = found.reduce(
      (acc, item) => {
        acc[item.tag] = (acc[item.tag] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return warn(
      "security-protocol-relative",
      `Found ${found.length} protocol-relative URL(s) in resources; use explicit https:// instead`,
      {
        count: found.length,
        byTag,
        examples: found.slice(0, 10).map((item) => `<${item.tag} ${item.attribute}="${item.url}">`),
        recommendation: "Replace protocol-relative URLs (//example.com) with explicit https:// URLs to prevent potential HTTP downgrades"
      }
    );
  }
});
