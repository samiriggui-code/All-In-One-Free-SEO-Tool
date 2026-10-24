import type { AssetInfo } from "@/audit/types";
import type { AuditContext } from "@/audit/types";
import { assetContentLength, partitionBySizeKnown, unsizedReason } from "@/audit/rules/performance/asset-size";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS7 = {
  /** Minimum bytes of inline CSS before we check minification */
  minBytesToCheck: 500,
  /** Whitespace ratio above this value suggests unminified CSS */
  whitespaceRatio: 0.15
};
export const EXTERNAL_THRESHOLDS = {
  /** External stylesheets above this size should be minified */
  minBytesToCheck: 2048,
  /** How many suspect URLs to list in the result message */
  maxListed: 5
};
export function calculateWhitespaceRatio(text: string) {
  if (text.length === 0) return 0;
  const newlineCount = (text.match(/\n/g) || []).length;
  const extraSpaces = (text.match(/ {2,}/g) || []).reduce((sum, m) => sum + m.length - 1, 0);
  const tabCount = (text.match(/\t/g) || []).length;
  const wastedChars = newlineCount + extraSpaces + tabCount;
  return wastedChars / text.length;
}
export function findCandidateStylesheets(assets: AssetInfo[]) {
  return assets.filter(
    (a) => a.resourceType === "stylesheet" && a.statusCode >= 200 && a.statusCode < 300 && !a.url.split("?")[0].toLowerCase().includes(".min.")
  );
}
export function checkInlineCss(context: AuditContext) {
  const { $ } = context;
  let totalInlineCss = "";
  let styleTagCount = 0;
  $("style").each((_, el) => {
    const content = $(el).html() || "";
    if (content.trim().length > 0) {
      totalInlineCss += content;
      styleTagCount++;
    }
  });
  const totalBytes = Buffer.byteLength(totalInlineCss, "utf8");
  const details: Record<string, unknown> = {
    styleTagCount,
    totalBytes,
    thresholds: THRESHOLDS7
  };
  if (totalBytes <= THRESHOLDS7.minBytesToCheck) {
    return pass(
      "perf-minify-css",
      styleTagCount === 0 ? "No inline CSS found" : `Inline CSS is minimal (${totalBytes} bytes across ${styleTagCount} <style> tag(s))`,
      details
    );
  }
  const whitespaceRatio = calculateWhitespaceRatio(totalInlineCss);
  details.whitespaceRatio = Math.round(whitespaceRatio * 1e3) / 1e3;
  if (whitespaceRatio > THRESHOLDS7.whitespaceRatio) {
    const estimatedSavings = Math.round(totalBytes * whitespaceRatio);
    return warn(
      "perf-minify-css",
      `Inline CSS appears unminified (${totalBytes} bytes, ~${Math.round(whitespaceRatio * 100)}% whitespace) \u2014 minification could save ~${estimatedSavings} bytes`,
      { ...details, estimatedSavingsBytes: estimatedSavings }
    );
  }
  return pass(
    "perf-minify-css",
    `Inline CSS is minified (${totalBytes} bytes, ${Math.round(whitespaceRatio * 100)}% whitespace)`,
    details
  );
}
export const minifyCssRule = defineRule({
  id: "perf-minify-css",
  name: "Minify Inline CSS",
  description: "Checks if inline CSS in <style> tags appears to be minified, and heuristically flags large external stylesheets without a .min. URL marker",
  category: "perf",
  weight: 5,
  run: (context) => {
    const inlineResult = checkInlineCss(context);
    const { assets } = context;
    if (!assets) return inlineResult;
    const { sized, unsized } = partitionBySizeKnown(findCandidateStylesheets(assets));
    const suspects = sized.filter(
      (a) => (assetContentLength(a) ?? 0) > EXTERNAL_THRESHOLDS.minBytesToCheck
    );
    if (suspects.length === 0) {
      if (unsized.length > 0 && inlineResult.status === "pass") {
        return notMeasured(
          "perf-minify-css",
          `Could not check external stylesheet minification \u2014 ${unsizedReason(unsized.length, "stylesheet")}. ${inlineResult.message}`,
          { ...inlineResult.details, unsizedCount: unsized.length, unsized: unsized.map((a) => a.url) }
        );
      }
      return inlineResult;
    }
    const listed = suspects.slice(0, EXTERNAL_THRESHOLDS.maxListed).map((a) => a.url);
    const suffix = suspects.length > EXTERNAL_THRESHOLDS.maxListed ? `, and ${suspects.length - EXTERNAL_THRESHOLDS.maxListed} more` : "";
    const suspectMessage = `${suspects.length} external stylesheet(s) appear unminified (heuristic: >${EXTERNAL_THRESHOLDS.minBytesToCheck} bytes and URL lacks ".min." \u2014 asset bodies are not inspected): ${listed.join(", ")}${suffix}` + (unsized.length > 0 ? `; additionally, ${unsizedReason(unsized.length, "stylesheet")}` : "");
    const details = {
      ...inlineResult.details,
      externalSuspects: suspects.map((a) => a.url),
      unsizedCount: unsized.length
    };
    if (inlineResult.status !== "pass") {
      return warn("perf-minify-css", `${inlineResult.message} \u2014 additionally, ${suspectMessage}`, details);
    }
    return warn("perf-minify-css", suspectMessage, details);
  }
});
