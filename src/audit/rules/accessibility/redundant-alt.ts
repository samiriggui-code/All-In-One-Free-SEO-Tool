import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function normalise(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export const redundantAltRule = defineRule({
  id: "a11y-redundant-alt",
  name: "Non-Redundant Alt Text",
  description: "Checks that image alt text does not duplicate adjacent link or caption text",
  category: "a11y",
  weight: 3,
  run: (context) => {
    const { $, url } = context;
    const redundant: { alt: string; context: string; }[] = [];
    $("img[alt]").each((_, el) => {
      const $el = $(el);
      const alt = $el.attr("alt")?.trim();
      if (!alt) return;
      const $container = $el.closest("a, figure");
      if ($container.length === 0) return;
      const surrounding = $container.text().trim();
      if (!surrounding) return;
      if (normalise(surrounding) === normalise(alt)) {
        redundant.push({ alt: alt.slice(0, 80), context: surrounding.slice(0, 80) });
      }
    });
    const details = { url, redundant };
    if (redundant.length > 0) {
      return warn(
        "a11y-redundant-alt",
        `${redundant.length} image(s) have alt text identical to their surrounding text, so it is announced twice`,
        details
      );
    }
    return pass("a11y-redundant-alt", "No redundant alt text found", details);
  }
});
