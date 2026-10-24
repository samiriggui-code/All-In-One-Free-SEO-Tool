import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const MIN_LENGTH3 = 1500;
export const MIN_ENTROPY = 4.8;
export const SINK = /(?:eval|Function|atob|unescape|fromCharCode)\s*\(/;
export function entropy(text: string) {
  const freq = /* @__PURE__ */ new Map();
  for (const char of text) freq.set(char, (freq.get(char) ?? 0) + 1);
  let value = 0;
  for (const count of freq.values()) {
    const p = count / text.length;
    value -= p * Math.log2(p);
  }
  return value;
}
export const obfuscatedScriptRule = defineRule({
  id: "security-obfuscated-script",
  name: "Obfuscated Inline Script",
  description: "Checks for a long, high-entropy inline script that calls eval, Function, or atob",
  category: "security",
  weight: 4,
  run: (context) => {
    const hits: { length: number; entropy: number; }[] = [];
    context.$("script:not([src])").each((_, el) => {
      const code = context.$(el).html() || "";
      if (code.length < MIN_LENGTH3 || !SINK.test(code)) return;
      const score = entropy(code);
      if (score < MIN_ENTROPY) return;
      if (hits.length < 3) hits.push({ length: code.length, entropy: Number(score.toFixed(2)) });
    });
    if (hits.length === 0) {
      return pass("security-obfuscated-script", "No obfuscated inline script found", { hits: [] });
    }
    return warn(
      "security-obfuscated-script",
      `${hits.length} inline script(s) are long, high-entropy, and call an eval-style function`,
      {
        hits,
        recommendation: "Remove the inline script if it is not yours. A legitimate decoder should live in a reviewed file, not an opaque block in the page."
      }
    );
  }
});
