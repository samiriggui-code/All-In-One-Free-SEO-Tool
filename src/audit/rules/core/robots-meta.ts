import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function parseRobotsDirectives(content: string) {
  return content.toLowerCase().split(/[,\s]+/).map((d) => d.trim()).filter((d) => d.length > 0);
}
export const robotsMetaRule = defineRule({
  id: "core-robots-meta",
  name: "Robots Meta",
  description: "Checks robots meta tag for indexing directives",
  category: "core",
  weight: 5,
  run: async (context) => {
    const { $, headers } = context;
    const issues = [];
    const allDirectives = [];
    const restrictiveDirectives = [
      "noindex",
      "nofollow",
      "noarchive",
      "nosnippet",
      // Also checked by nosnippet rule, but relevant here for completeness
      "noimageindex",
      "none"
      // Equivalent to noindex, nofollow
    ];
    const parseDirectives2 = parseRobotsDirectives;
    const robotsMeta = $('meta[name="robots"]');
    robotsMeta.each((_, el) => {
      const content = $(el).attr("content") || "";
      const directives = parseDirectives2(content);
      allDirectives.push({ source: 'meta[name="robots"]', directives });
      for (const directive of directives) {
        if (restrictiveDirectives.includes(directive)) {
          issues.push(`robots: "${directive}"`);
        }
      }
    });
    const googlebotMeta = $('meta[name="googlebot"]');
    googlebotMeta.each((_, el) => {
      const content = $(el).attr("content") || "";
      const directives = parseDirectives2(content);
      allDirectives.push({ source: 'meta[name="googlebot"]', directives });
      for (const directive of directives) {
        if (restrictiveDirectives.includes(directive)) {
          issues.push(`googlebot: "${directive}"`);
        }
      }
    });
    const bingbotMeta = $('meta[name="bingbot"]');
    bingbotMeta.each((_, el) => {
      const content = $(el).attr("content") || "";
      const directives = parseDirectives2(content);
      allDirectives.push({ source: 'meta[name="bingbot"]', directives });
      for (const directive of directives) {
        if (restrictiveDirectives.includes(directive)) {
          issues.push(`bingbot: "${directive}"`);
        }
      }
    });
    const xRobotsTag = headers["x-robots-tag"] || headers["X-Robots-Tag"] || "";
    if (xRobotsTag) {
      const directives = parseDirectives2(xRobotsTag);
      allDirectives.push({ source: "X-Robots-Tag header", directives });
      for (const directive of directives) {
        if (restrictiveDirectives.includes(directive)) {
          issues.push(`X-Robots-Tag: "${directive}"`);
        }
      }
    }
    if (issues.length > 0) {
      return warn(
        "core-robots-meta",
        `Restrictive indexing directives found: ${issues.join(", ")}`,
        {
          issues,
          allDirectives,
          impact: "These directives may limit search visibility or prevent indexation",
          recommendation: "Remove restrictive directives unless intentionally blocking search engines"
        }
      );
    }
    if (allDirectives.length === 0) {
      return pass(
        "core-robots-meta",
        "No robots meta tag found (default: index, follow)",
        { allDirectives: [], defaultBehavior: "index, follow" }
      );
    }
    return pass(
      "core-robots-meta",
      "Robots directives allow indexing",
      { allDirectives }
    );
  }
});
