import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { headSource, noscriptBodies, startTags } from "@/audit/rules/html/head-source";

export const PERMITTED_NOSCRIPT_HEAD_ELEMENTS = /* @__PURE__ */ new Set([
  "link",
  "style",
  "meta"
]);
export const noscriptInHeadRule = defineRule({
  id: "htmlval-noscript-in-head",
  name: "Noscript in Head",
  description: "Checks that <noscript> inside <head> contains only permitted elements (link, style, meta)",
  category: "htmlval",
  weight: 5,
  run: async (context) => {
    const headNoscripts = noscriptBodies(headSource(context.html) ?? "");
    if (headNoscripts.length === 0) {
      return pass(
        "htmlval-noscript-in-head",
        "No <noscript> elements found in <head>"
      );
    }
    const invalidElements = [
      ...new Set(
        headNoscripts.flatMap(startTags).filter((tag) => !PERMITTED_NOSCRIPT_HEAD_ELEMENTS.has(tag))
      )
    ];
    if (invalidElements.length > 0) {
      return warn(
        "htmlval-noscript-in-head",
        `<noscript> in <head> contains non-permitted elements: <${invalidElements.join(">, <")}>. Only <link>, <style>, and <meta> are allowed`,
        { invalidElements, count: invalidElements.length }
      );
    }
    return pass(
      "htmlval-noscript-in-head",
      "<noscript> in <head> contains only permitted elements"
    );
  }
});
