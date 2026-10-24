import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const nosnippetRule = defineRule({
  id: "core-nosnippet",
  name: "Nosnippet Directive",
  description: "Detects pages preventing search engine snippets",
  category: "core",
  weight: 7,
  run: async (context) => {
    const { $, headers } = context;
    const issues = [];
    const directives = [];
    const robotsMeta = $('meta[name="robots"]');
    robotsMeta.each((_, el) => {
      const content = $(el).attr("content")?.toLowerCase() || "";
      directives.push(content);
      if (content.includes("nosnippet")) {
        issues.push('Meta robots contains "nosnippet"');
      }
      const maxSnippetMatch = content.match(/max-snippet\s*:\s*(-?\d+)/);
      if (maxSnippetMatch && parseInt(maxSnippetMatch[1], 10) <= 0) {
        issues.push(`Meta robots contains "max-snippet:${maxSnippetMatch[1]}" (blocks snippets)`);
      }
    });
    const googlebotMeta = $('meta[name="googlebot"]');
    googlebotMeta.each((_, el) => {
      const content = $(el).attr("content")?.toLowerCase() || "";
      directives.push(`googlebot: ${content}`);
      if (content.includes("nosnippet")) {
        issues.push('Meta googlebot contains "nosnippet"');
      }
      const maxSnippetMatch = content.match(/max-snippet\s*:\s*(-?\d+)/);
      if (maxSnippetMatch && parseInt(maxSnippetMatch[1], 10) <= 0) {
        issues.push(`Meta googlebot contains "max-snippet:${maxSnippetMatch[1]}" (blocks snippets)`);
      }
    });
    const xRobotsTag = headers["x-robots-tag"] || headers["X-Robots-Tag"] || "";
    if (xRobotsTag) {
      const lowerTag = xRobotsTag.toLowerCase();
      directives.push(`X-Robots-Tag: ${xRobotsTag}`);
      if (lowerTag.includes("nosnippet")) {
        issues.push('X-Robots-Tag header contains "nosnippet"');
      }
      const maxSnippetMatch = lowerTag.match(/max-snippet\s*:\s*(-?\d+)/);
      if (maxSnippetMatch && parseInt(maxSnippetMatch[1], 10) <= 0) {
        issues.push(`X-Robots-Tag header contains "max-snippet:${maxSnippetMatch[1]}" (blocks snippets)`);
      }
    }
    if (issues.length > 0) {
      return warn(
        "core-nosnippet",
        `Page blocks search snippets: ${issues.join("; ")}`,
        {
          issues,
          directives,
          impact: "Prevents search engines from showing descriptions in search results, severely harming click-through rates",
          recommendation: "Remove nosnippet directive unless specifically needed for sensitive content (login, legal pages)"
        }
      );
    }
    return pass(
      "core-nosnippet",
      "Page allows search engine snippets",
      { directives: directives.length > 0 ? directives : ["none found"] }
    );
  }
});
