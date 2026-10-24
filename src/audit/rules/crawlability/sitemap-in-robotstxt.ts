import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function extractSitemapDirectives(content: string) {
  const sitemapUrls = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    if (/^sitemap:/i.test(trimmed)) {
      const url = trimmed.substring(trimmed.indexOf(":") + 1).trim();
      if (url) {
        sitemapUrls.push(url);
      }
    }
  }
  return sitemapUrls;
}
export const sitemapInRobotstxtRule = defineRule({
  id: "crawl-sitemap-in-robotstxt",
  name: "Sitemap in robots.txt",
  description: "Checks if robots.txt references the sitemap",
  category: "crawl",
  weight: 6,
  run: async (context) => {
    const robotsTxtContent = context.robotsTxtContent;
    if (!robotsTxtContent) {
      return pass(
        "crawl-sitemap-in-robotstxt",
        "No robots.txt content available to check",
        { robotsTxtAvailable: false }
      );
    }
    const sitemapDirectives = extractSitemapDirectives(robotsTxtContent);
    const details = {
      sitemapDirectiveCount: sitemapDirectives.length,
      sitemapUrls: sitemapDirectives
    };
    if (sitemapDirectives.length === 0) {
      return warn(
        "crawl-sitemap-in-robotstxt",
        "robots.txt does not reference a sitemap",
        {
          ...details,
          impact: "Search engines may not discover the sitemap without a Sitemap: directive",
          recommendation: "Add a Sitemap: directive to robots.txt (e.g., Sitemap: https://example.com/sitemap.xml)"
        }
      );
    }
    return pass(
      "crawl-sitemap-in-robotstxt",
      `robots.txt references ${sitemapDirectives.length} sitemap(s)`,
      details
    );
  }
});
