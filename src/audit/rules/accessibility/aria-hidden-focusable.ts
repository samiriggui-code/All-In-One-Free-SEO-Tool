import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const NATIVELY_FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, iframe, [tabindex]';
export const ariaHiddenFocusableRule = defineRule({
  id: "a11y-aria-hidden-focusable",
  name: "aria-hidden Not Over Focusable Content",
  description: "Checks that aria-hidden is not on the body or wrapping focusable elements",
  category: "a11y",
  weight: 4,
  run: (context) => {
    const { $, url } = context;
    const issues = [];
    if ($('body[aria-hidden="true"]').length > 0) {
      issues.push({ problem: "aria-hidden-body", detail: 'aria-hidden="true" on <body>' });
    }
    $('[aria-hidden="true"]').each((_, el) => {
      const $el = $(el);
      const tag = (el.tagName ?? "?").toLowerCase();
      if (tag === "body") return;
      const focusable = $el.find(NATIVELY_FOCUSABLE).filter((__, child) => {
        const tabindex = $(child).attr("tabindex");
        return tabindex === void 0 || Number(tabindex) >= 0;
      });
      if (focusable.length > 0) {
        issues.push({
          problem: "focusable-descendant",
          detail: `<${tag}> hides ${focusable.length} focusable element(s)`
        });
      }
    });
    const details = { url, issues };
    if (issues.length > 0) {
      return fail(
        "a11y-aria-hidden-focusable",
        `${issues.length} aria-hidden problem(s): content is hidden from screen readers but still reachable by keyboard`,
        details
      );
    }
    return pass("a11y-aria-hidden-focusable", "aria-hidden is not hiding focusable content", details);
  }
});
