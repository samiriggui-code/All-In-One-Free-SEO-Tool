import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS10 = {
  /** HTML < 100KB is optimal */
  good: 100 * 1024,
  /** HTML 100-300KB is acceptable */
  warning: 300 * 1024
};
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)}MB`;
}
export const pageWeightRule = defineRule({
  id: "perf-page-weight",
  name: "Page Weight",
  description: "Checks HTML document size against recommended thresholds",
  category: "perf",
  weight: 8,
  run: (context) => {
    const { $, html } = context;
    const htmlBytes = Buffer.byteLength(html, "utf8");
    const externalScripts = $("script[src]").length;
    const externalStylesheets = $('link[rel="stylesheet"]').length;
    const imageCount = $("img").length;
    const details = {
      htmlBytes,
      htmlSize: formatBytes(htmlBytes),
      externalScripts,
      externalStylesheets,
      imageCount,
      thresholds: {
        good: formatBytes(THRESHOLDS10.good),
        warning: formatBytes(THRESHOLDS10.warning)
      }
    };
    if (htmlBytes > THRESHOLDS10.warning) {
      return fail(
        "perf-page-weight",
        `HTML document is ${formatBytes(htmlBytes)} (recommended: <${formatBytes(THRESHOLDS10.good)}) \u2014 consider reducing inline content, splitting pages, or lazy loading`,
        details
      );
    }
    if (htmlBytes > THRESHOLDS10.good) {
      return warn(
        "perf-page-weight",
        `HTML document is ${formatBytes(htmlBytes)} (recommended: <${formatBytes(THRESHOLDS10.good)}) \u2014 consider externalizing inline resources`,
        details
      );
    }
    return pass(
      "perf-page-weight",
      `HTML document is ${formatBytes(htmlBytes)} \u2014 within optimal range`,
      details
    );
  }
});
