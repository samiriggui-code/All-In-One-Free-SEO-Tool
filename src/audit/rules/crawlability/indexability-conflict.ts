import type { CheerioAPI } from "cheerio";
import { RobotsMatcher } from "@/audit/crawler/robots";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { fetchPage } from "@/audit/crawler/fetcher";

export function getBaseUrl8(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return url;
  }
}
export function getPath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return "/";
  }
}
export function getNoindexDirectives($: CheerioAPI, headers: Record<string, string>) {
  const sources = [];
  const robotsMeta = $('meta[name="robots"]').attr("content") || "";
  if (/noindex/i.test(robotsMeta)) {
    sources.push('meta[name="robots"]');
  }
  const googlebotMeta = $('meta[name="googlebot"]').attr("content") || "";
  if (/noindex/i.test(googlebotMeta)) {
    sources.push('meta[name="googlebot"]');
  }
  const xRobotsTag = headers["x-robots-tag"] || headers["X-Robots-Tag"] || "";
  if (/noindex/i.test(xRobotsTag)) {
    sources.push("X-Robots-Tag header");
  }
  return sources;
}
export const indexabilityConflictRule = defineRule({
  id: "crawl-indexability-conflict",
  name: "Indexability Conflict",
  description: "Detects conflicts between robots.txt and noindex directives",
  category: "crawl",
  weight: 15,
  run: async (context) => {
    const { $, url, headers } = context;
    const noindexSources = getNoindexDirectives($, headers);
    const hasNoindex4 = noindexSources.length > 0;
    const baseUrl = getBaseUrl8(url);
    const robotsTxtUrl = `${baseUrl}/robots.txt`;
    const pagePath = getPath(url);
    let robotsTxtStatus = "not-found";
    let robotsTxt = context.robotsTxtContent;
    if (robotsTxt !== void 0) {
      robotsTxtStatus = "accessible";
    } else {
      try {
        const result = await fetchPage(robotsTxtUrl);
        if (result.statusCode === 200) {
          robotsTxtStatus = "accessible";
          robotsTxt = result.html;
        } else if (result.statusCode !== 404) {
          robotsTxtStatus = "error";
        }
      } catch {
        robotsTxtStatus = "error";
      }
    }
    const verdict = robotsTxt !== void 0 ? new RobotsMatcher(robotsTxt, "Googlebot").explain(url) : { allowed: true, pattern: null };
    const isDisallowed = !verdict.allowed;
    const matchedRule = verdict.pattern;
    const details = {
      url: pagePath,
      robotsTxtStatus,
      hasNoindex: hasNoindex4,
      noindexSources,
      isDisallowedByRobotsTxt: isDisallowed,
      matchedDisallowRule: matchedRule
    };
    if (robotsTxtStatus !== "accessible") {
      return pass(
        "crawl-indexability-conflict",
        robotsTxtStatus === "not-found" ? "No robots.txt found (no conflict possible)" : "Could not access robots.txt to check for conflicts",
        details
      );
    }
    if (isDisallowed && hasNoindex4) {
      return warn(
        "crawl-indexability-conflict",
        `Page is blocked by robots.txt AND has noindex (redundant)`,
        {
          ...details,
          conflictType: "redundant-noindex",
          impact: "Search engines cannot crawl the page to see the noindex directive",
          recommendation: "Choose one method: either block in robots.txt OR use noindex, not both"
        }
      );
    }
    if (!isDisallowed && hasNoindex4) {
      return pass(
        "crawl-indexability-conflict",
        "robots.txt allows crawling, noindex prevents indexing (functional but check if intentional)",
        {
          ...details,
          conflictType: "none",
          note: "This is a valid configuration if you want the page crawlable but not indexed"
        }
      );
    }
    if (isDisallowed && !hasNoindex4) {
      return warn(
        "crawl-indexability-conflict",
        `Page blocked by robots.txt (${matchedRule}) but has no noindex`,
        {
          ...details,
          conflictType: "blocked-but-indexable",
          impact: "Page could still be indexed if linked from other sites",
          recommendation: "Add noindex if you want to guarantee no indexing, or allow crawling in robots.txt"
        }
      );
    }
    return pass(
      "crawl-indexability-conflict",
      "No indexability conflict detected",
      details
    );
  }
});
