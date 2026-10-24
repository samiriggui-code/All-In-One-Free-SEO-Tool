import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS11 = {
  /** Inline JS < 50KB is optimal */
  good: 50 * 1024,
  /** Inline JS 50-150KB is acceptable */
  warning: 150 * 1024
};
export function formatBytes2(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)}MB`;
}
export const jsFileSizeRule = defineRule({
  id: "perf-js-file-size",
  name: "Inline JS Size",
  description: "Checks total inline JavaScript size across all <script> tags",
  category: "perf",
  weight: 5,
  run: (context) => {
    const { $ } = context;
    let totalBytes = 0;
    let inlineScriptCount = 0;
    let largestScriptBytes = 0;
    $("script:not([src])").each((_, el) => {
      const content = $(el).html() || "";
      const type = $(el).attr("type") || "";
      if (type && type !== "text/javascript" && type !== "module" && type !== "application/javascript") {
        return;
      }
      if (content.trim().length > 0) {
        const bytes = Buffer.byteLength(content, "utf8");
        totalBytes += bytes;
        inlineScriptCount++;
        if (bytes > largestScriptBytes) {
          largestScriptBytes = bytes;
        }
      }
    });
    const details = {
      totalBytes,
      totalSize: formatBytes2(totalBytes),
      inlineScriptCount,
      largestScriptBytes,
      largestScriptSize: formatBytes2(largestScriptBytes),
      thresholds: {
        good: formatBytes2(THRESHOLDS11.good),
        warning: formatBytes2(THRESHOLDS11.warning)
      }
    };
    if (totalBytes > THRESHOLDS11.warning) {
      return fail(
        "perf-js-file-size",
        `Total inline JavaScript is ${formatBytes2(totalBytes)} across ${inlineScriptCount} script(s) (recommended: <${formatBytes2(THRESHOLDS11.good)}) \u2014 externalize large scripts for caching`,
        details
      );
    }
    if (totalBytes > THRESHOLDS11.good) {
      return warn(
        "perf-js-file-size",
        `Total inline JavaScript is ${formatBytes2(totalBytes)} across ${inlineScriptCount} script(s) (recommended: <${formatBytes2(THRESHOLDS11.good)}) \u2014 consider externalizing`,
        details
      );
    }
    return pass(
      "perf-js-file-size",
      inlineScriptCount === 0 ? "No inline JavaScript found" : `Inline JavaScript is ${formatBytes2(totalBytes)} across ${inlineScriptCount} script(s) \u2014 within optimal range`,
      details
    );
  }
});
