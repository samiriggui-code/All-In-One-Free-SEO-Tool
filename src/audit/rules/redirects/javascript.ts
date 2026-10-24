import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const JS_REDIRECT_PATTERNS = [
  /window\.location\s*[=.]/,
  /location\.href\s*=/,
  /location\.replace\s*\(/,
  /location\.assign\s*\(/,
  /document\.location\s*[=.]/
];
export const javascriptRedirectRule = defineRule({
  id: "redirect-javascript",
  name: "No JavaScript Redirects",
  description: "Checks for JavaScript-based redirects that search engines may not follow",
  category: "redirect",
  weight: 12,
  run: (context) => {
    const { $ } = context;
    const inlineScripts: string[] = [];
    $("script:not([src])").each((_, el) => {
      const text = $(el).text();
      if (text.trim()) {
        inlineScripts.push(text);
      }
    });
    if (inlineScripts.length === 0) {
      return pass("redirect-javascript", "No inline scripts found");
    }
    const detectedPatterns = [];
    for (const scriptText of inlineScripts) {
      for (const pattern of JS_REDIRECT_PATTERNS) {
        if (pattern.test(scriptText)) {
          detectedPatterns.push(pattern.source);
        }
      }
    }
    const uniquePatterns = [...new Set(detectedPatterns)];
    if (uniquePatterns.length === 0) {
      return pass("redirect-javascript", "No JavaScript redirects detected in inline scripts");
    }
    return warn(
      "redirect-javascript",
      `JavaScript redirect detected (${uniquePatterns.length} pattern(s) found); search engines may not follow`,
      {
        matchedPatterns: uniquePatterns,
        inlineScriptCount: inlineScripts.length
      }
    );
  }
});
