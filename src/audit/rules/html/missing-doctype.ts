import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const missingDoctypeRule = defineRule({
  id: "htmlval-missing-doctype",
  name: "DOCTYPE Declaration",
  description: "Checks that the HTML document starts with a <!DOCTYPE> declaration",
  category: "htmlval",
  weight: 15,
  run: async (context) => {
    const trimmed = context.html.trimStart();
    const hasDoctypeRegex = /^<!doctype\s/i;
    if (hasDoctypeRegex.test(trimmed)) {
      return pass(
        "htmlval-missing-doctype",
        "DOCTYPE declaration is present"
      );
    }
    return fail(
      "htmlval-missing-doctype",
      "Missing DOCTYPE declaration. Add <!DOCTYPE html> at the beginning of the document",
      { found: false }
    );
  }
});
