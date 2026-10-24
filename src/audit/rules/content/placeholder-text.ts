import { collectVisibleText } from "@/audit/rules/content/utils/visible-text";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const TEMPLATE = [/\{\{[^{}]{1,80}\}\}/, /\{%[^%]{1,80}%\}/, /<%[\s\S]{1,80}%>/, /\[object Object\]/];
export const NOTE = /\b(?:TODO|FIXME)\s*:/;
export const SAMPLE_LIMIT5 = 3;
export const placeholderTextRule = defineRule({
  id: "content-placeholder-text",
  name: "Placeholder Text",
  description: "Checks visible text for unrendered template syntax and TODO or FIXME notes",
  category: "content",
  weight: 8,
  run: (context) => {
    const templates = [];
    const notes = [];
    for (const chunk of collectVisibleText(context.$)) {
      const template = TEMPLATE.map((pattern) => chunk.match(pattern)?.[0]).find(Boolean);
      if (template && templates.length < SAMPLE_LIMIT5) templates.push(template);
      const note = chunk.match(NOTE)?.[0];
      if (note && notes.length < SAMPLE_LIMIT5) notes.push(chunk.replace(/\s+/g, " ").trim().slice(0, 80));
    }
    if (templates.length > 0) {
      return fail(
        "content-placeholder-text",
        `Visible text contains unrendered template syntax: ${templates.join("; ")}`,
        {
          templates,
          notes,
          recommendation: "Render the template before the page is served. A visitor should not see {{ }}, {% %}, or [object Object]."
        }
      );
    }
    if (notes.length > 0) {
      return warn(
        "content-placeholder-text",
        `Visible text contains author notes: ${notes.join("; ")}`,
        {
          templates,
          notes,
          recommendation: "Remove TODO and FIXME notes from published copy."
        }
      );
    }
    return pass("content-placeholder-text", "No template leftovers or author notes in visible text", {
      templates: [],
      notes: []
    });
  }
});
