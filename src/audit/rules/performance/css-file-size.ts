import type { CheerioAPI } from "cheerio";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS2 = {
  externalFiles: { good: 3, warning: 6 },
  inlineCssKb: { good: 50, warning: 100 }
};
export function analyzeCss($: CheerioAPI) {
  const externalUrls: string[] = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      externalUrls.push(href);
    }
  });
  let inlineCssBytes = 0;
  let inlineStyleCount = 0;
  $("style").each((_, el) => {
    const content = $(el).html() || "";
    inlineCssBytes += content.length;
    inlineStyleCount++;
  });
  const hasPreloadCss = $('link[rel="preload"][as="style"]').length > 0;
  return {
    externalCount: externalUrls.length,
    externalUrls,
    inlineStyleCount,
    inlineCssBytes,
    hasPreloadCss
  };
}
export const cssFileSizeRule = defineRule({
  id: "perf-css-file-size",
  name: "CSS File Size",
  description: "Checks CSS file count and inline CSS size for performance",
  category: "perf",
  weight: 10,
  run: (context) => {
    const { $ } = context;
    const analysis = analyzeCss($);
    const issues = [];
    let severity = "pass";
    if (analysis.externalCount > THRESHOLDS2.externalFiles.warning) {
      issues.push(`${analysis.externalCount} external CSS files (recommended: <=${THRESHOLDS2.externalFiles.good})`);
      severity = "fail";
    } else if (analysis.externalCount > THRESHOLDS2.externalFiles.good) {
      issues.push(`${analysis.externalCount} external CSS files - consider bundling`);
      severity = "warn";
    }
    const inlineCssKb = Math.round(analysis.inlineCssBytes / 1024);
    if (inlineCssKb > THRESHOLDS2.inlineCssKb.warning) {
      issues.push(`${inlineCssKb}KB inline CSS (recommended: <${THRESHOLDS2.inlineCssKb.good}KB)`);
      if (severity !== "fail") severity = "fail";
    } else if (inlineCssKb > THRESHOLDS2.inlineCssKb.good) {
      issues.push(`${inlineCssKb}KB inline CSS - consider extracting to external file`);
      if (severity === "pass") severity = "warn";
    }
    const details = {
      externalCssCount: analysis.externalCount,
      externalCssUrls: analysis.externalUrls.slice(0, 10),
      inlineStyleCount: analysis.inlineStyleCount,
      inlineCssKb,
      hasPreloadCss: analysis.hasPreloadCss,
      thresholds: THRESHOLDS2
    };
    if (severity === "fail") {
      return fail("perf-css-file-size", `CSS optimization needed: ${issues.join("; ")}`, details);
    }
    if (severity === "warn") {
      return warn("perf-css-file-size", `CSS could be optimized: ${issues.join("; ")}`, details);
    }
    const summary = analysis.externalCount === 0 ? "No external CSS files (inline only)" : `${analysis.externalCount} CSS file(s), ${inlineCssKb}KB inline`;
    return pass("perf-css-file-size", `CSS is well optimized: ${summary}`, details);
  }
});
