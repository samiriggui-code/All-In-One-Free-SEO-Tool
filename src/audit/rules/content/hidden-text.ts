import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const HIDDEN_STYLE = /display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?![.\d])|text-indent\s*:\s*-\d{3,}px|opacity\s*:\s*0(?:\.0+)?(?![.\d])/i;
export const EXEMPT = /(?:^|\s)(?:sr-only|visually-hidden|screen-reader-text|screen-reader-only|visuallyhidden)(?:\s|$)|cookie|consent|gdpr|banner|modal|dialog|popup|drawer|offcanvas|submenu/i;
export const MIN_CHARS = 80;
export const SAMPLE_LIMIT6 = 3;
export const hiddenTextRule = defineRule({
  id: "content-hidden-text",
  name: "Hidden Text",
  description: "Checks for long text hidden with an inline style, excluding navigation, dialogs, and screen-reader text",
  category: "content",
  weight: 6,
  run: (context) => {
    const { $ } = context;
    const samples: string[] = [];
    $("[style]").each((_, el) => {
      if (samples.length >= SAMPLE_LIMIT6) return;
      const node = $(el);
      const style = node.attr("style") || "";
      if (!HIDDEN_STYLE.test(style)) return;
      if (node.closest('script, style, noscript, svg, template, nav, [role="navigation"], [role="dialog"], [role="menu"]').length) {
        return;
      }
      if (node.parents("[style]").toArray().some((parent) => HIDDEN_STYLE.test($(parent).attr("style") || ""))) {
        return;
      }
      const classAndId = `${node.attr("class") || ""} ${node.attr("id") || ""}`;
      if (EXEMPT.test(classAndId)) return;
      const text = node.text().replace(/\s+/g, " ").trim();
      if (text.length < MIN_CHARS) return;
      samples.push(text.slice(0, 120));
    });
    if (samples.length === 0) {
      return pass("content-hidden-text", "No long text hidden with an inline style", {
        samples: []
      });
    }
    return warn(
      "content-hidden-text",
      `${samples.length} block(s) of text are hidden with an inline style`,
      {
        samples,
        recommendation: "Remove text that is hidden from visitors. Screen-reader text should use a dedicated class such as sr-only, which this rule ignores."
      }
    );
  }
});
