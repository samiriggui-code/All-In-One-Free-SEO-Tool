import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/i;
export const ALLOWED_SCHEMES = /* @__PURE__ */ new Set(["http", "https", "tel", "mailto", "javascript"]);
export const nonHttpProtocolRule = defineRule({
  id: "links-non-http-protocol",
  name: "No Non-HTTP Protocol Links",
  description: "Checks for anchor links using protocols other than HTTP(S), tel: or mailto: (e.g. ftp:, file:, intent:)",
  category: "links",
  weight: 4,
  run: (context) => {
    const found: { href: string; protocol: string; text: string; }[] = [];
    context.$("a[href]").each((_i, el) => {
      const node = context.$(el);
      const href = node.attr("href") || "";
      const match = SCHEME_PATTERN.exec(href.trim());
      if (!match) return;
      const protocol = match[1].toLowerCase();
      if (ALLOWED_SCHEMES.has(protocol)) return;
      const text = (node.text().trim() || node.attr("title") || "").slice(0, 200);
      found.push({ href, protocol, text });
    });
    if (found.length > 0) {
      const protocols = [...new Set(found.map((f) => f.protocol))];
      return warn(
        "links-non-http-protocol",
        `Found ${found.length} link(s) using non-HTTP protocol(s): ${protocols.join(", ")}`,
        {
          nonHttpLinkCount: found.length,
          protocols,
          nonHttpLinks: found.slice(0, 10),
          recommendation: "Review links using non-HTTP protocols; browsers hand them to external handlers, so prefer HTTP(S) URLs unless the protocol is intentional"
        }
      );
    }
    return pass(
      "links-non-http-protocol",
      "All links use HTTP(S), tel: or mailto: protocols",
      { totalLinksChecked: context.$("a[href]").length }
    );
  }
});
