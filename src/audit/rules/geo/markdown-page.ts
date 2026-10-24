import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { looksLikeHtml, probeOnce, type ProbeResult } from "@/audit/rules/geo/probe";

export function isMarkdown(result: ProbeResult): boolean {
  if (!result || result.status !== 200) return false;
  if (/markdown/i.test(result.contentType)) return true;
  return !looksLikeHtml(result);
}
export function siblingMarkdown(pageUrl: string) {
  try {
    const url = new URL(pageUrl);
    if (url.pathname === "/" || url.pathname === "") return null;
    const path3 = url.pathname.replace(/\/$/, "");
    return `${url.origin}${path3}.md`;
  } catch {
    return null;
  }
}
export const markdownPageRule = defineRule({
  id: "geo-markdown-page",
  name: "Markdown For This URL",
  description: "Checks that a non-root URL has a Markdown representation",
  category: "geo",
  weight: 1,
  run: async (context) => {
    let path3 = "/";
    try {
      path3 = new URL(context.url).pathname;
    } catch {
      return pass("geo-markdown-page", "Page URL cannot be parsed", { found: false });
    }
    if (path3 === "/" || path3 === "") {
      return pass("geo-markdown-page", "The origin root is checked by the Markdown response rule", {
        root: true
      });
    }
    const negotiated = await probeOnce(context.url, { Accept: "text/markdown" }, context.signal);
    if (isMarkdown(negotiated)) {
      return pass("geo-markdown-page", "This URL responds with Markdown", { via: "accept" });
    }
    const sibling = siblingMarkdown(context.url);
    if (sibling) {
      const variant = await probeOnce(sibling, {}, context.signal);
      if (isMarkdown(variant)) {
        return pass("geo-markdown-page", `${sibling} is available`, { via: "sibling" });
      }
    }
    return warn("geo-markdown-page", "This URL has no Markdown representation", {
      recommendation: "Answer Accept: text/markdown for this URL, or publish the same path with a .md suffix."
    });
  }
});
