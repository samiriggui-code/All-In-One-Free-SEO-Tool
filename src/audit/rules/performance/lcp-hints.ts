import type { CheerioAPI } from "cheerio";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export function analyzeLcpHints($: CheerioAPI) {
  const preloadedImages: string[] = [];
  let candidate = null;
  $('link[rel="preload"][as="image"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      preloadedImages.push(href);
    }
  });
  const heroSelectors = [
    "img.hero",
    "img.banner",
    ".hero img",
    ".banner img",
    "header img",
    '[class*="hero"] img',
    '[class*="banner"] img',
    "main > img:first-child",
    "main > figure:first-child img",
    "main > section:first-child img"
  ];
  for (const selector of heroSelectors) {
    const $hero = $(selector).first();
    if ($hero.length) {
      const src = $hero.attr("src") || "";
      const fetchPriority = $hero.attr("fetchpriority");
      const loading = $hero.attr("loading");
      candidate = {
        type: "image",
        element: selector,
        src,
        hasPreload: preloadedImages.includes(src),
        hasFetchPriority: fetchPriority === "high",
        fetchPriority: fetchPriority || null,
        isLazyLoaded: loading === "lazy"
      };
      break;
    }
  }
  if (!candidate) {
    const $firstImg = $("img").first();
    if ($firstImg.length) {
      const src = $firstImg.attr("src") || "";
      const fetchPriority = $firstImg.attr("fetchpriority");
      const loading = $firstImg.attr("loading");
      const width = parseInt($firstImg.attr("width") || "0", 10);
      const height = parseInt($firstImg.attr("height") || "0", 10);
      const isLarge = width > 400 || height > 300;
      const className = $firstImg.attr("class") || "";
      const hasLargeClass = /hero|banner|featured|cover|main/i.test(className);
      if (isLarge || hasLargeClass || !width) {
        candidate = {
          type: "image",
          element: "img:first",
          src,
          hasPreload: preloadedImages.includes(src),
          hasFetchPriority: fetchPriority === "high",
          fetchPriority: fetchPriority || null,
          isLazyLoaded: loading === "lazy"
        };
      }
    }
  }
  if (!candidate) {
    const $video = $("video[poster]").first();
    if ($video.length) {
      const poster = $video.attr("poster") || "";
      candidate = {
        type: "video-poster",
        element: "video[poster]",
        src: poster,
        hasPreload: preloadedImages.includes(poster),
        hasFetchPriority: false,
        fetchPriority: null,
        isLazyLoaded: false
      };
    }
  }
  const hasAnyLcpOptimization = preloadedImages.length > 0 || (candidate?.hasFetchPriority ?? false);
  return {
    candidate,
    preloadedImages,
    hasAnyLcpOptimization
  };
}
export const lcpHintsRule = defineRule({
  id: "perf-lcp-hints",
  name: "LCP Optimization Hints",
  description: "Checks for Largest Contentful Paint optimization (preload, fetchpriority)",
  category: "perf",
  weight: 10,
  run: (context) => {
    const { $ } = context;
    const analysis = analyzeLcpHints($);
    const details = {
      candidate: analysis.candidate,
      preloadedImages: analysis.preloadedImages.slice(0, 5),
      hasAnyOptimization: analysis.hasAnyLcpOptimization
    };
    if (!analysis.candidate) {
      if (analysis.preloadedImages.length > 0) {
        return pass(
          "perf-lcp-hints",
          `${analysis.preloadedImages.length} image(s) preloaded`,
          details
        );
      }
      return pass("perf-lcp-hints", "No clear LCP image candidate detected", details);
    }
    const candidate = analysis.candidate;
    const issues = [];
    if (candidate.isLazyLoaded) {
      return fail(
        "perf-lcp-hints",
        `LCP candidate (${candidate.element}) has loading="lazy" - this severely impacts LCP`,
        details
      );
    }
    if (!candidate.hasPreload && !candidate.hasFetchPriority) {
      issues.push("no preload or fetchpriority");
    } else if (!candidate.hasPreload) {
      issues.push("missing preload");
    } else if (!candidate.hasFetchPriority) {
      issues.push('missing fetchpriority="high"');
    }
    if (issues.length > 0) {
      return warn(
        "perf-lcp-hints",
        `LCP candidate (${candidate.element}) could be optimized: ${issues.join(", ")}`,
        details
      );
    }
    return pass(
      "perf-lcp-hints",
      `LCP candidate (${candidate.element}) is optimized with preload and fetchpriority`,
      details
    );
  }
});
