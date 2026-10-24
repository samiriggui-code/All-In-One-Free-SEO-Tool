import { defineRule, pass } from "@/audit/engine/define-rule";

export const OPT_OUT = /* @__PURE__ */ new Set(["noai", "noimageai"]);
export function directivesFrom(value: string|undefined) {
  if (!value) return [];
  return value.split(/[,\s]+/).map((token) => token.trim().toLowerCase()).filter((token) => OPT_OUT.has(token));
}
export const noaiSignalsRule = defineRule({
  id: "geo-noai-signals",
  name: "AI Opt-Out Directives",
  description: "Reports noai and noimageai in robots meta tags and the X-Robots-Tag header",
  category: "geo",
  weight: 1,
  run: (context) => {
    const found = /* @__PURE__ */ new Set();
    context.$('meta[name="robots" i], meta[name="googlebot" i]').each((_, el) => {
      for (const token of directivesFrom(context.$(el).attr("content"))) found.add(token);
    });
    const header = context.headers["x-robots-tag"] || context.headers["X-Robots-Tag"];
    for (const token of directivesFrom(header)) found.add(token);
    const directives = [...found];
    if (directives.length === 0) {
      return pass("geo-noai-signals", "No noai or noimageai directive", { directives });
    }
    return pass(
      "geo-noai-signals",
      `AI opt-out declared: ${directives.join(", ")}`,
      { directives }
    );
  }
});
