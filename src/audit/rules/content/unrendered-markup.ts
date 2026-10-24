import { collectVisibleText } from "@/audit/rules/content/utils/visible-text";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const MARKDOWN = [
  /\*\*[^*\n]{1,120}\*\*/,
  /__[^_\n]{1,120}__/,
  /\[[^\]\n]{1,120}\]\((?:https?:\/\/|\/)[^)\s]+\)/,
  /!\[[^\]]*\]\([^)\s]+\)/
];
export const SAMPLE_LIMIT4 = 3;
export const unrenderedMarkupRule = defineRule({
  id: "content-unrendered-markup",
  name: "Unrendered Markup",
  description: "Checks visible text for Markdown that was printed instead of rendered",
  category: "content",
  weight: 6,
  run: (context) => {
    const samples = [];
    for (const chunk of collectVisibleText(context.$)) {
      const match = MARKDOWN.map((pattern) => chunk.match(pattern)?.[0]).find(Boolean);
      if (!match) continue;
      samples.push(match);
      if (samples.length >= SAMPLE_LIMIT4) break;
    }
    if (samples.length === 0) {
      return pass("content-unrendered-markup", "No unrendered Markdown in visible text", {
        samples: []
      });
    }
    return warn(
      "content-unrendered-markup",
      `Visible text contains unrendered Markdown: ${samples.join("; ")}`,
      {
        samples,
        recommendation: "Render the field as HTML before publishing, or stop storing Markdown in a plain-text slot."
      }
    );
  }
});
