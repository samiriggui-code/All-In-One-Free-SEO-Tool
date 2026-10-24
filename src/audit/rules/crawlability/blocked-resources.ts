import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const RESOURCE_PATH_PATTERNS = [
  "/css/",
  "/js/",
  "/assets/",
  "/static/",
  "/wp-content/",
  "/wp-includes/",
  "/themes/",
  "/scripts/",
  "/styles/"
];
export const RESOURCE_EXTENSION_PATTERNS = [
  ".css",
  ".js"
];
export function extractDisallowRules(content: string) {
  const lines = content.split("\n").map((line) => line.trim());
  const disallowRules = [];
  let inRelevantUserAgent = false;
  let sawAnyUserAgent = false;
  for (const line of lines) {
    if (line.startsWith("#") || !line) {
      continue;
    }
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();
    if (directive === "user-agent") {
      sawAnyUserAgent = true;
      inRelevantUserAgent = value === "*" || value.toLowerCase().includes("googlebot") || value.toLowerCase().includes("bingbot");
    } else if ((inRelevantUserAgent || !sawAnyUserAgent) && directive === "disallow" && value) {
      disallowRules.push(value);
    }
  }
  return disallowRules;
}
export function findBlockedResources(disallowRules: string[]) {
  const blockedPaths = [];
  const blockedExtensions = [];
  for (const rule of disallowRules) {
    const lowerRule = rule.toLowerCase();
    for (const pattern of RESOURCE_PATH_PATTERNS) {
      if (lowerRule === pattern || lowerRule.startsWith(pattern)) {
        blockedPaths.push(rule);
        break;
      }
    }
    for (const ext of RESOURCE_EXTENSION_PATTERNS) {
      if (lowerRule.includes("*" + ext) || lowerRule.endsWith(ext + "$")) {
        blockedExtensions.push(rule);
        break;
      }
    }
  }
  return { blockedPaths, blockedExtensions };
}
export const blockedResourcesRule = defineRule({
  id: "crawl-blocked-resources",
  name: "Blocked Resources",
  description: "Checks if robots.txt blocks important CSS/JS resources",
  category: "crawl",
  weight: 7,
  run: async (context) => {
    const robotsTxtContent = context.robotsTxtContent;
    if (!robotsTxtContent) {
      return pass(
        "crawl-blocked-resources",
        "No robots.txt content available to check",
        { robotsTxtAvailable: false }
      );
    }
    const disallowRules = extractDisallowRules(robotsTxtContent);
    if (disallowRules.length === 0) {
      return pass(
        "crawl-blocked-resources",
        "No Disallow rules found in robots.txt",
        { disallowRuleCount: 0 }
      );
    }
    const { blockedPaths, blockedExtensions } = findBlockedResources(disallowRules);
    const allBlocked = /* @__PURE__ */ new Set([...blockedPaths, ...blockedExtensions]);
    const totalBlocked = allBlocked.size;
    const details = {
      disallowRuleCount: disallowRules.length,
      blockedResourcePaths: blockedPaths,
      blockedResourceExtensions: blockedExtensions,
      totalBlockedRules: totalBlocked
    };
    if (totalBlocked > 0) {
      const issues = [];
      if (blockedPaths.length > 0) {
        issues.push(`${blockedPaths.length} path rule(s) blocking resource directories`);
      }
      if (blockedExtensions.length > 0) {
        issues.push(`${blockedExtensions.length} rule(s) blocking CSS/JS file extensions`);
      }
      return warn(
        "crawl-blocked-resources",
        `robots.txt may block CSS/JS resources: ${issues.join("; ")}`,
        {
          ...details,
          impact: "Search engines cannot render pages properly without CSS and JavaScript",
          recommendation: "Allow search engines to access CSS and JS files by removing or adjusting these Disallow rules"
        }
      );
    }
    return pass(
      "crawl-blocked-resources",
      "robots.txt does not block important CSS/JS resources",
      details
    );
  }
});
