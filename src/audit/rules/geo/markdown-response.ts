import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { looksLikeHtml, probeOnce } from "@/audit/rules/geo/probe";

export function originOf3(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
export const markdownResponseRule = defineRule({
  id: "geo-markdown-response",
  name: "Markdown Response",
  description: "Checks that the origin can serve a Markdown representation of its root",
  category: "geo",
  weight: 2,
  run: async (context) => {
    const origin = originOf3(context.url);
    if (!origin) {
      return pass("geo-markdown-response", "Page URL has no origin to probe", { found: false });
    }
    const negotiated = await probeOnce(
      `${origin}/`,
      { Accept: "text/markdown" },
      context.signal
    );
    if (negotiated && negotiated.status === 200 && (/markdown/i.test(negotiated.contentType) || !looksLikeHtml(negotiated))) {
      return pass("geo-markdown-response", "Root responds with Markdown", { via: "accept" });
    }
    const variant = await probeOnce(`${origin}/index.md`, {}, context.signal);
    if (variant && variant.status === 200 && !looksLikeHtml(variant)) {
      return pass("geo-markdown-response", "index.md is available", { via: "index.md" });
    }
    return warn("geo-markdown-response", "The origin does not serve a Markdown representation of /", {
      recommendation: "Answer Accept: text/markdown for /, or publish /index.md, so an agent can read the page without the HTML chrome."
    });
  }
});
