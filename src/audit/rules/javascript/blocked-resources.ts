import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function parseDisallowPaths(robotsTxtContent: string) {
  const paths = [];
  const lines = robotsTxtContent.split("\n");
  let inUserAgentAll = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^user-agent:\s*\*/i.test(trimmed)) {
      inUserAgentAll = true;
      continue;
    }
    if (/^user-agent:/i.test(trimmed)) {
      inUserAgentAll = false;
      continue;
    }
    if (inUserAgentAll && /^disallow:\s*/i.test(trimmed)) {
      const path3 = trimmed.replace(/^disallow:\s*/i, "").trim();
      if (path3) {
        paths.push(path3);
      }
    }
  }
  return paths;
}
export function isPathBlocked(urlPath: string, disallowPatterns: string[]) {
  for (const pattern of disallowPatterns) {
    if (pattern.includes("*")) {
      const regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      try {
        const regex = new RegExp(`^${regexStr}`);
        if (regex.test(urlPath)) return true;
      } catch {
      }
    } else {
      if (urlPath.startsWith(pattern)) return true;
    }
  }
  return false;
}
export const blockedResourcesRule2 = defineRule({
  id: "js-blocked-resources",
  name: "Blocked JavaScript Resources",
  description: "Checks if JavaScript resources may be blocked by robots.txt",
  category: "js",
  weight: 7,
  run: async (context) => {
    const robotsTxtContent = context.robotsTxtContent;
    if (!robotsTxtContent) {
      return pass(
        "js-blocked-resources",
        "No robots.txt available to check for blocked JS resources"
      );
    }
    const disallowPaths = parseDisallowPaths(robotsTxtContent);
    if (disallowPaths.length === 0) {
      return pass(
        "js-blocked-resources",
        "No Disallow rules found in robots.txt",
        { disallowCount: 0 }
      );
    }
    const scriptSources: string[] = [];
    context.$("script[src]").each((_, el) => {
      const src = context.$(el).attr("src");
      if (src) {
        scriptSources.push(src);
      }
    });
    if (scriptSources.length === 0) {
      return pass(
        "js-blocked-resources",
        "No external script sources found on the page",
        { scriptCount: 0 }
      );
    }
    const blockedScripts = [];
    const pageUrl = new URL(context.url);
    for (const src of scriptSources) {
      try {
        const scriptUrl = new URL(src, context.url);
        if (scriptUrl.hostname !== pageUrl.hostname) continue;
        if (isPathBlocked(scriptUrl.pathname, disallowPaths)) {
          blockedScripts.push(src);
        }
      } catch {
      }
    }
    if (blockedScripts.length > 0) {
      return warn(
        "js-blocked-resources",
        `${blockedScripts.length} JavaScript resource(s) may be blocked by robots.txt`,
        {
          blockedScripts,
          totalScripts: scriptSources.length,
          impact: "Search engines cannot render the page properly if JS resources are blocked",
          recommendation: "Allow search engine access to JavaScript files in robots.txt"
        }
      );
    }
    return pass(
      "js-blocked-resources",
      "No JavaScript resources are blocked by robots.txt",
      {
        totalScripts: scriptSources.length,
        disallowPatterns: disallowPaths.length
      }
    );
  }
});
