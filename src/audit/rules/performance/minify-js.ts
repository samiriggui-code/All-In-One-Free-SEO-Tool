import type { AssetInfo } from "@/audit/types";
import type { AuditContext } from "@/audit/types";
import { assetContentLength, partitionBySizeKnown, unsizedReason } from "@/audit/rules/performance/asset-size";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS8 = {
  /** Minimum bytes of inline JS before we check minification */
  minBytesToCheck: 500,
  /** Whitespace ratio above this value suggests unminified JS */
  whitespaceRatio: 0.15
};
export const EXTERNAL_THRESHOLDS2 = {
  /** External scripts above this size should be minified */
  minBytesToCheck: 2048,
  /** How many suspect URLs to list in the result message */
  maxListed: 5
};
export function calculateWhitespaceRatio2(text: string) {
  if (text.length === 0) return 0;
  const newlineCount = (text.match(/\n/g) || []).length;
  const extraSpaces = (text.match(/ {2,}/g) || []).reduce((sum, m) => sum + m.length - 1, 0);
  const tabCount = (text.match(/\t/g) || []).length;
  const wastedChars = newlineCount + extraSpaces + tabCount;
  return wastedChars / text.length;
}
export function countBlockCommentBytes(text: string) {
  const comments = text.match(/\/\*[\s\S]*?\*\//g) || [];
  return comments.reduce((sum, c) => sum + c.length, 0);
}
export function findCandidateScripts(assets: AssetInfo[]) {
  return assets.filter(
    (a) => a.resourceType === "script" && a.statusCode >= 200 && a.statusCode < 300 && !a.url.split("?")[0].toLowerCase().includes(".min.")
  );
}
export function checkInlineJs(context: AuditContext) {
  const { $ } = context;
  let totalInlineJs = "";
  let scriptTagCount = 0;
  $("script:not([src])").each((_, el) => {
    const content = $(el).html() || "";
    const type = $(el).attr("type") || "";
    if (type && type !== "text/javascript" && type !== "module" && type !== "application/javascript") {
      return;
    }
    if (content.trim().length > 0) {
      totalInlineJs += content;
      scriptTagCount++;
    }
  });
  const totalBytes = Buffer.byteLength(totalInlineJs, "utf8");
  const details: Record<string, unknown> = {
    scriptTagCount,
    totalBytes,
    thresholds: THRESHOLDS8
  };
  if (totalBytes <= THRESHOLDS8.minBytesToCheck) {
    return pass(
      "perf-minify-js",
      scriptTagCount === 0 ? "No inline JavaScript found" : `Inline JavaScript is minimal (${totalBytes} bytes across ${scriptTagCount} <script> tag(s))`,
      details
    );
  }
  const whitespaceRatio = calculateWhitespaceRatio2(totalInlineJs);
  const blockCommentBytes = countBlockCommentBytes(totalInlineJs);
  details.whitespaceRatio = Math.round(whitespaceRatio * 1e3) / 1e3;
  details.blockCommentBytes = blockCommentBytes;
  const hasBlockComments = blockCommentBytes > 0;
  const isUnminified = whitespaceRatio > THRESHOLDS8.whitespaceRatio || hasBlockComments;
  if (isUnminified) {
    const reasons = [];
    if (whitespaceRatio > THRESHOLDS8.whitespaceRatio) {
      reasons.push(`~${Math.round(whitespaceRatio * 100)}% whitespace`);
    }
    if (hasBlockComments) {
      reasons.push(`${blockCommentBytes} bytes in block comments`);
    }
    const estimatedSavings = Math.round(totalBytes * whitespaceRatio) + blockCommentBytes;
    return warn(
      "perf-minify-js",
      `Inline JavaScript appears unminified (${totalBytes} bytes, ${reasons.join(", ")}) \u2014 minification could save ~${estimatedSavings} bytes`,
      { ...details, estimatedSavingsBytes: estimatedSavings }
    );
  }
  return pass(
    "perf-minify-js",
    `Inline JavaScript is minified (${totalBytes} bytes, ${Math.round(whitespaceRatio * 100)}% whitespace)`,
    details
  );
}
export const minifyJsRule = defineRule({
  id: "perf-minify-js",
  name: "Minify Inline JS",
  description: "Checks if inline JavaScript in <script> tags appears to be minified, and heuristically flags large external scripts without a .min. URL marker",
  category: "perf",
  weight: 5,
  run: (context) => {
    const inlineResult = checkInlineJs(context);
    const { assets } = context;
    if (!assets) return inlineResult;
    const { sized, unsized } = partitionBySizeKnown(findCandidateScripts(assets));
    const suspects = sized.filter(
      (a) => (assetContentLength(a) ?? 0) > EXTERNAL_THRESHOLDS2.minBytesToCheck
    );
    if (suspects.length === 0) {
      if (unsized.length > 0 && inlineResult.status === "pass") {
        return notMeasured(
          "perf-minify-js",
          `Could not check external script minification \u2014 ${unsizedReason(unsized.length, "script")}. ${inlineResult.message}`,
          { ...inlineResult.details, unsizedCount: unsized.length, unsized: unsized.map((a) => a.url) }
        );
      }
      return inlineResult;
    }
    const listed = suspects.slice(0, EXTERNAL_THRESHOLDS2.maxListed).map((a) => a.url);
    const suffix = suspects.length > EXTERNAL_THRESHOLDS2.maxListed ? `, and ${suspects.length - EXTERNAL_THRESHOLDS2.maxListed} more` : "";
    const suspectMessage = `${suspects.length} external script(s) appear unminified (heuristic: >${EXTERNAL_THRESHOLDS2.minBytesToCheck} bytes and URL lacks ".min." \u2014 asset bodies are not inspected): ${listed.join(", ")}${suffix}` + (unsized.length > 0 ? `; additionally, ${unsizedReason(unsized.length, "script")}` : "");
    const details = {
      ...inlineResult.details,
      externalSuspects: suspects.map((a) => a.url),
      unsizedCount: unsized.length
    };
    if (inlineResult.status !== "pass") {
      return warn("perf-minify-js", `${inlineResult.message} \u2014 additionally, ${suspectMessage}`, details);
    }
    return warn("perf-minify-js", suspectMessage, details);
  }
});
