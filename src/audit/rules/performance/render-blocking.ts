import type { CheerioAPI } from "cheerio";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS4 = {
  blockingScripts: { good: 0, warning: 2 },
  blockingCss: { good: 0 }
  // Any non-critical CSS in head is a concern
};
export function analyzeRenderBlocking($: CheerioAPI) {
  const blockingScripts: { src: string; inHead: boolean; }[] = [];
  let inlineScriptsInHead = 0;
  const largeInlineScripts: { size: number; }[] = [];
  const potentiallyBlockingCss: string[] = [];
  let asyncScripts = 0;
  let deferScripts = 0;
  let moduleScripts = 0;
  $("head script").each((_, el) => {
    const src = $(el).attr("src");
    const isAsync = $(el).attr("async") !== void 0;
    const isDefer = $(el).attr("defer") !== void 0;
    const isModule = $(el).attr("type") === "module";
    if (isAsync) asyncScripts++;
    if (isDefer) deferScripts++;
    if (isModule) moduleScripts++;
    if (src && !isAsync && !isDefer && !isModule) {
      blockingScripts.push({ src, inHead: true });
    }
    if (!src) {
      const content = $(el).html() || "";
      const sizeKb = Math.round(content.length / 1024);
      inlineScriptsInHead++;
      if (sizeKb > 10) {
        largeInlineScripts.push({ size: sizeKb });
      }
    }
  });
  $("body script[src]").each((_, el) => {
    const src = $(el).attr("src");
    const isAsync = $(el).attr("async") !== void 0;
    const isDefer = $(el).attr("defer") !== void 0;
    const isModule = $(el).attr("type") === "module";
    if (isAsync) asyncScripts++;
    if (isDefer) deferScripts++;
    if (isModule) moduleScripts++;
    if (src && !isAsync && !isDefer && !isModule) {
      blockingScripts.push({ src, inHead: false });
    }
  });
  $('head link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href");
    const media = $(el).attr("media");
    if (href && (!media || media === "all" || media === "screen")) {
      potentiallyBlockingCss.push(href);
    }
  });
  return {
    blockingScripts,
    inlineScriptsInHead,
    largeInlineScripts,
    potentiallyBlockingCss,
    asyncScripts,
    deferScripts,
    moduleScripts
  };
}
export const renderBlockingRule = defineRule({
  id: "perf-render-blocking",
  name: "Render-Blocking Resources",
  description: "Checks for render-blocking CSS and JavaScript in the head",
  category: "perf",
  weight: 20,
  run: (context) => {
    const { $ } = context;
    const analysis = analyzeRenderBlocking($);
    const issues = [];
    let severity = "pass";
    const blockingInHead = analysis.blockingScripts.filter((s) => s.inHead);
    if (blockingInHead.length > THRESHOLDS4.blockingScripts.warning) {
      issues.push(`${blockingInHead.length} render-blocking scripts in <head>`);
      severity = "fail";
    } else if (blockingInHead.length > THRESHOLDS4.blockingScripts.good) {
      issues.push(`${blockingInHead.length} script(s) in <head> without async/defer`);
      severity = "warn";
    }
    if (analysis.largeInlineScripts.length > 0) {
      const totalKb = analysis.largeInlineScripts.reduce((sum, s) => sum + s.size, 0);
      issues.push(`${analysis.largeInlineScripts.length} large inline script(s) (${totalKb}KB total)`);
      if (severity === "pass") severity = "warn";
    }
    const cssNote = analysis.potentiallyBlockingCss.length > 3 ? `${analysis.potentiallyBlockingCss.length} CSS files in head (consider critical CSS extraction)` : null;
    if (cssNote && severity === "pass" && analysis.potentiallyBlockingCss.length > 5) {
      issues.push(cssNote);
      severity = "warn";
    }
    const details = {
      blockingScripts: analysis.blockingScripts.slice(0, 10),
      inlineScriptsInHead: analysis.inlineScriptsInHead,
      largeInlineScripts: analysis.largeInlineScripts,
      potentiallyBlockingCss: analysis.potentiallyBlockingCss.slice(0, 5),
      asyncScripts: analysis.asyncScripts,
      deferScripts: analysis.deferScripts,
      moduleScripts: analysis.moduleScripts
    };
    if (severity === "fail") {
      return fail("perf-render-blocking", `Render-blocking resources detected: ${issues.join("; ")}`, details);
    }
    if (severity === "warn") {
      return warn("perf-render-blocking", `Render-blocking resources found: ${issues.join("; ")}`, details);
    }
    const optimizedCount = analysis.asyncScripts + analysis.deferScripts + analysis.moduleScripts;
    const message = optimizedCount > 0 ? `No render-blocking scripts (${optimizedCount} async/defer/module)` : analysis.blockingScripts.length === 0 ? "No external scripts in head" : "Scripts properly optimized";
    return pass("perf-render-blocking", message, details);
  }
});
