import type { CheerioAPI } from "cheerio";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS3 = {
  maxFontFiles: 6
  // Warn if more than 6 font files
};
export function analyzeFontLoading($: CheerioAPI) {
  const preloadedFonts: string[] = [];
  const googleFontsLinks: { href: string; hasDisplaySwap: boolean; }[] = [];
  let fontFacesWithDisplay = 0;
  let fontFacesWithoutDisplay = 0;
  $('link[rel="preload"][as="font"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      preloadedFonts.push(href);
    }
  });
  $('link[rel="stylesheet"], link[rel="preconnect"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes("fonts.googleapis.com") || href.includes("fonts.gstatic.com")) {
      const hasDisplaySwap = href.includes("display=swap");
      googleFontsLinks.push({ href, hasDisplaySwap });
    }
  });
  $("style").each((_, el) => {
    const content = $(el).html() || "";
    const fontFaceMatches = content.match(/@font-face\s*\{[^}]*\}/g) || [];
    for (const fontFace of fontFaceMatches) {
      if (/font-display\s*:\s*(swap|optional|fallback|block)/i.test(fontFace)) {
        fontFacesWithDisplay++;
      } else {
        fontFacesWithoutDisplay++;
      }
    }
  });
  let totalFontLinks = 0;
  $('link[rel="preload"][as="font"], link[href*=".woff"], link[href*=".woff2"], link[href*=".ttf"]').each(() => {
    totalFontLinks++;
  });
  $("style").each((_, el) => {
    const content = $(el).html() || "";
    const fontSrcMatches = content.match(/url\s*\([^)]*\.(woff2?|ttf|otf|eot)/gi) || [];
    totalFontLinks += fontSrcMatches.length;
  });
  const hasAnyOptimization = preloadedFonts.length > 0 || googleFontsLinks.some((f) => f.hasDisplaySwap) || fontFacesWithDisplay > 0;
  return {
    preloadedFonts,
    googleFontsLinks,
    fontFacesWithDisplay,
    fontFacesWithoutDisplay,
    totalFontLinks,
    hasAnyOptimization
  };
}
export const fontLoadingRule = defineRule({
  id: "perf-font-loading",
  name: "Font Loading",
  description: "Checks for font loading best practices (font-display, preload)",
  category: "perf",
  weight: 15,
  run: (context) => {
    const { $ } = context;
    const analysis = analyzeFontLoading($);
    const issues = [];
    let severity = "pass";
    if (analysis.googleFontsLinks.length === 0 && analysis.fontFacesWithDisplay === 0 && analysis.fontFacesWithoutDisplay === 0 && analysis.preloadedFonts.length === 0 && analysis.totalFontLinks === 0) {
      return pass("perf-font-loading", "No custom fonts detected", {
        preloadedFonts: [],
        googleFontsLinks: [],
        fontFacesWithDisplay: 0,
        fontFacesWithoutDisplay: 0
      });
    }
    const googleFontsWithoutSwap = analysis.googleFontsLinks.filter((f) => !f.hasDisplaySwap);
    if (googleFontsWithoutSwap.length > 0) {
      issues.push(`${googleFontsWithoutSwap.length} Google Fonts URL(s) missing display=swap`);
      severity = "warn";
    }
    if (analysis.fontFacesWithoutDisplay > 0) {
      issues.push(`${analysis.fontFacesWithoutDisplay} @font-face rule(s) missing font-display`);
      severity = "warn";
    }
    if (analysis.preloadedFonts.length === 0 && analysis.totalFontLinks > 0) {
      issues.push("No fonts are preloaded");
      if (severity === "pass") severity = "warn";
    }
    if (analysis.totalFontLinks > THRESHOLDS3.maxFontFiles) {
      issues.push(`${analysis.totalFontLinks} font files loaded (consider reducing)`);
      if (severity === "pass") severity = "warn";
    }
    if (!analysis.hasAnyOptimization && analysis.totalFontLinks > 0) {
      severity = "fail";
    }
    const details = {
      preloadedFonts: analysis.preloadedFonts,
      googleFontsLinks: analysis.googleFontsLinks.slice(0, 5),
      fontFacesWithDisplay: analysis.fontFacesWithDisplay,
      fontFacesWithoutDisplay: analysis.fontFacesWithoutDisplay,
      totalFontLinks: analysis.totalFontLinks
    };
    if (severity === "fail") {
      return fail("perf-font-loading", `Font loading not optimized: ${issues.join("; ")}`, details);
    }
    if (severity === "warn") {
      return warn("perf-font-loading", `Font loading could be improved: ${issues.join("; ")}`, details);
    }
    const optimizations = [];
    if (analysis.preloadedFonts.length > 0) optimizations.push(`${analysis.preloadedFonts.length} preloaded`);
    if (analysis.fontFacesWithDisplay > 0) optimizations.push(`font-display set`);
    if (analysis.googleFontsLinks.every((f) => f.hasDisplaySwap)) optimizations.push("display=swap");
    return pass(
      "perf-font-loading",
      `Font loading is optimized (${optimizations.join(", ")})`,
      details
    );
  }
});
