import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const INVALID_ATTRIBUTES = ["hreflang", "lang", "media", "type"];
export const ALLOWED_ATTRIBUTES = ["rel", "href"];
export const canonicalAttributesRule = defineRule({
  id: "core-canonical-attributes",
  name: "Canonical Attributes",
  description: 'Checks that <link rel="canonical"> elements carry only rel and href attributes',
  category: "core",
  weight: 7,
  run: async (context) => {
    const { $ } = context;
    const canonicals = $('link[rel="canonical"]');
    if (canonicals.length === 0) {
      return pass(
        "core-canonical-attributes",
        "No canonical element present",
        { found: false }
      );
    }
    const invalid = /* @__PURE__ */ new Set();
    const superfluous = /* @__PURE__ */ new Set();
    canonicals.each((_, el) => {
      const attribs = el.attribs ?? {};
      for (const name of Object.keys(attribs)) {
        const lower = name.toLowerCase();
        if (ALLOWED_ATTRIBUTES.includes(lower)) continue;
        if (INVALID_ATTRIBUTES.includes(lower)) {
          invalid.add(lower);
        } else {
          superfluous.add(lower);
        }
      }
    });
    if (invalid.size > 0) {
      const invalidList = [...invalid].join(", ");
      return fail(
        "core-canonical-attributes",
        `Canonical element carries invalid attribute(s): ${invalidList}`,
        {
          invalidAttributes: [...invalid],
          superfluousAttributes: [...superfluous],
          impact: "These attributes change the canonical semantics and cause search engines to ignore the annotation",
          recommendation: "Remove invalid attributes from the canonical element; use alternate annotations (e.g. hreflang links) where appropriate"
        }
      );
    }
    if (superfluous.size > 0) {
      const superfluousList = [...superfluous].join(", ");
      return warn(
        "core-canonical-attributes",
        `Canonical element carries superfluous attribute(s): ${superfluousList}`,
        {
          superfluousAttributes: [...superfluous],
          impact: "Attributes other than rel and href are ignored on canonical elements",
          recommendation: "Simplify the canonical element to only rel and href attributes"
        }
      );
    }
    return pass(
      "core-canonical-attributes",
      "Canonical element carries only rel and href attributes",
      { found: true }
    );
  }
});
