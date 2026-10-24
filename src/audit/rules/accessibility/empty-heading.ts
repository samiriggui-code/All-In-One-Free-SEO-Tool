import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const emptyHeadingRule = defineRule({
  id: "a11y-empty-heading",
  name: "Headings Contain Content",
  description: "Checks that no heading element is empty or inaccessible",
  category: "a11y",
  weight: 5,
  run: (context) => {
    const { $, url } = context;
    const empty2: { tag: string; reason: string; }[] = [];
    let total = 0;
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      const $el = $(el);
      total++;
      if ($el.attr("aria-hidden") === "true") return;
      const tag = el.tagName ?? "h?";
      const text = $el.text().trim();
      const imgAlt = $el.find("img[alt]").toArray().some((img) => $(img).attr("alt")?.trim());
      if (text || imgAlt) return;
      if ($el.attr("aria-label")?.trim() || $el.attr("aria-labelledby")?.trim()) return;
      empty2.push({ tag, reason: "no text, labelled image, or ARIA label" });
    });
    const details = { url, total, empty: empty2 };
    if (empty2.length > 0) {
      return fail("a11y-empty-heading", `${empty2.length} empty heading(s) found`, details);
    }
    return pass(
      "a11y-empty-heading",
      total > 0 ? `All ${total} heading(s) contain content` : "No headings on the page",
      details
    );
  }
});
