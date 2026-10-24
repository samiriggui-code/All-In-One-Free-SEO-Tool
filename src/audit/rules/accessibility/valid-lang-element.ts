import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const BCP47_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i;
export const validLangElementRule = defineRule({
  id: "a11y-valid-lang-element",
  name: "Valid Element Language Tags",
  description: "Checks that lang attributes on elements are well-formed BCP 47 tags",
  category: "a11y",
  weight: 2,
  run: (context) => {
    const { $, url } = context;
    const invalid: { tag: string; lang: string; }[] = [];
    let total = 0;
    $("[lang]:not(html)").each((_, el) => {
      const $el = $(el);
      const lang = $el.attr("lang")?.trim();
      total++;
      if (lang && BCP47_PATTERN.test(lang)) return;
      invalid.push({
        tag: (el.tagName ?? "?").toLowerCase(),
        lang: lang || "(empty)"
      });
    });
    const details = { url, total, invalid };
    if (total === 0) {
      return pass("a11y-valid-lang-element", "No element-level lang attributes to validate", details);
    }
    if (invalid.length > 0) {
      return warn(
        "a11y-valid-lang-element",
        `${invalid.length} of ${total} element lang attribute(s) are not valid BCP 47: ${invalid.map((i) => `${i.tag}="${i.lang}"`).join(", ")}`,
        details
      );
    }
    return pass("a11y-valid-lang-element", `All ${total} element lang attribute(s) are valid`, details);
  }
});
