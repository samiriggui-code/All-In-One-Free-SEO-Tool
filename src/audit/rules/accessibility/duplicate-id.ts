import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const duplicateIdRule = defineRule({
  id: "a11y-duplicate-id",
  name: "Unique Element IDs",
  description: "Checks that no ID is used more than once, which breaks ARIA and label references",
  category: "a11y",
  weight: 4,
  run: (context) => {
    const { $, url } = context;
    const counts = /* @__PURE__ */ new Map();
    const svgInternal = /* @__PURE__ */ new Set();
    $("[id]").each((_, el) => {
      const $el = $(el);
      const id = $el.attr("id")?.trim();
      if (!id) return;
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if ($el.closest("svg").length > 0) svgInternal.add(id);
    });
    const referenced = /* @__PURE__ */ new Set();
    $("[aria-labelledby], [aria-describedby], [aria-controls], label[for]").each((_, el) => {
      const $el = $(el);
      const refs = [
        $el.attr("aria-labelledby"),
        $el.attr("aria-describedby"),
        $el.attr("aria-controls"),
        $el.attr("for")
      ];
      for (const ref of refs) {
        if (!ref) continue;
        for (const id of ref.trim().split(/\s+/)) referenced.add(id);
      }
    });
    const duplicates = Array.from(counts).filter(([, count]) => count > 1).map(([id, count]) => ({
      id,
      count,
      referenced: referenced.has(id),
      svgInternal: svgInternal.has(id)
    }));
    const breaking = duplicates.filter((d) => d.referenced);
    const documentLevel = duplicates.filter((d) => !d.svgInternal && !d.referenced);
    const details = {
      url,
      duplicates,
      breakingCount: breaking.length,
      svgInternalCount: duplicates.length - documentLevel.length - breaking.length
    };
    if (breaking.length > 0) {
      return fail(
        "a11y-duplicate-id",
        `${breaking.length} duplicated ID(s) are targeted by ARIA or label references: ${breaking.map((d) => d.id).join(", ")}`,
        details
      );
    }
    if (documentLevel.length > 0) {
      return warn(
        "a11y-duplicate-id",
        `${documentLevel.length} duplicated ID(s) found: ${documentLevel.map((d) => d.id).join(", ")}`,
        details
      );
    }
    return pass(
      "a11y-duplicate-id",
      details.svgInternalCount > 0 ? `No ARIA-breaking duplicate IDs (${details.svgInternalCount} duplicated inside <svg>, which is harmless)` : "All element IDs are unique",
      details
    );
  }
});
