import { collectVisibleText } from "@/audit/rules/content/utils/visible-text";
import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const MOJIBAKE = /\u00E2\u20AC[\u0098-\u009D\u0152\u0153\u0178\u02DC\u2018\u2019\u201C\u201D\u2122]|\u00C3[\u00A0-\u00FF]|\u00C2[\u00A0-\u00BF]|\u00EF\u00BF\u00BD|\uFFFD/;
export const SAMPLE_LIMIT3 = 3;
export const mojibakeRule = defineRule({
  id: "content-mojibake",
  name: "Mojibake In Visible Text",
  description: "Checks visible text for UTF-8 bytes that were decoded as Latin-1 or Windows-1252",
  category: "content",
  weight: 8,
  run: (context) => {
    const samples = [];
    for (const chunk of collectVisibleText(context.$)) {
      if (!MOJIBAKE.test(chunk)) continue;
      MOJIBAKE.lastIndex = 0;
      samples.push(chunk.replace(/\s+/g, " ").trim().slice(0, 120));
      if (samples.length >= SAMPLE_LIMIT3) break;
    }
    if (samples.length === 0) {
      return pass("content-mojibake", "No mojibake in visible text", {
        samples: []
      });
    }
    return fail(
      "content-mojibake",
      `Visible text contains encoding corruption (${samples.length} sample${samples.length === 1 ? "" : "s"})`,
      {
        samples,
        recommendation: "Serve the HTML as UTF-8 and re-save the source as UTF-8. Typical corruption is a curly quote or accented letter decoded as Latin-1."
      }
    );
  }
});
