import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function words(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export const labelNameMismatchRule = defineRule({
  id: "a11y-label-name-mismatch",
  name: "Accessible Name Matches Visible Label",
  description: "Checks that aria-label text contains the element visible text",
  category: "a11y",
  weight: 3,
  run: (context) => {
    const { $, url } = context;
    const mismatched: { tag: string; visible: string; accessible: string; }[] = [];
    $('button[aria-label], a[href][aria-label], [role="button"][aria-label]').each((_, el) => {
      const $el = $(el);
      const visible = $el.text().trim();
      const accessible = $el.attr("aria-label")?.trim();
      if (!visible || !accessible) return;
      const visibleWords = words(visible);
      const accessibleWords = words(accessible);
      if (!visibleWords) return;
      if (accessibleWords.includes(visibleWords)) return;
      mismatched.push({
        tag: (el.tagName ?? "?").toLowerCase(),
        visible: visible.slice(0, 60),
        accessible: accessible.slice(0, 60)
      });
    });
    const details = { url, mismatched };
    if (mismatched.length > 0) {
      return warn(
        "a11y-label-name-mismatch",
        `${mismatched.length} control(s) have an accessible name that omits their visible text, breaking voice control`,
        details
      );
    }
    return pass("a11y-label-name-mismatch", "Accessible names contain their visible labels", details);
  }
});
