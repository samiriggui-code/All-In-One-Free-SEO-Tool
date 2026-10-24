import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function normalise2(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export const identicalLinksPurposeRule = defineRule({
  id: "a11y-identical-links-purpose",
  name: "Identical Links Same Purpose",
  description: "Checks that links sharing the same text point to the same destination",
  category: "a11y",
  weight: 4,
  run: (context) => {
    const { $, url } = context;
    const byText = /* @__PURE__ */ new Map();
    $("a[href]").each((_, el) => {
      const $el = $(el);
      const name = $el.attr("aria-label")?.trim() || $el.text().trim() || $el.attr("title")?.trim();
      if (!name) return;
      const href = $el.attr("href")?.trim();
      if (!href || href.startsWith("#")) return;
      const destination = href.replace(/#.*$/, "").replace(/\/+$/, "") || "/";
      const key = normalise2(name);
      if (!key) return;
      if (!byText.has(key)) byText.set(key, /* @__PURE__ */ new Set());
      byText.get(key).add(destination);
    });
    const ambiguous = Array.from(byText).filter(([, hrefs]) => hrefs.size > 1).map(([text, hrefs]) => ({
      text,
      destinations: Array.from(hrefs).slice(0, 5),
      count: hrefs.size
    }));
    const details = { url, ambiguous };
    if (ambiguous.length > 0) {
      return warn(
        "a11y-identical-links-purpose",
        `${ambiguous.length} link text(s) point to different destinations: ${ambiguous.map((a) => `"${a.text}" (${a.count} targets)`).join(", ")}`,
        details
      );
    }
    return pass("a11y-identical-links-purpose", "Links with identical text share a destination", details);
  }
});
