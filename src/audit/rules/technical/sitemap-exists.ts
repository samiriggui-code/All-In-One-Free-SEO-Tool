import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { fetchPage, fetchUrl } from "@/audit/crawler/fetcher";
import { rethrowIfAborted } from "@/audit/engine/errors";

export function getBaseUrl3(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return url;
  }
}
export function extractSitemapUrlsFromRobotsTxt(content: string) {
  const sitemapUrls = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.startsWith("sitemap:")) {
      const url = line.substring(line.indexOf(":") + 1).trim();
      if (url) {
        sitemapUrls.push(url);
      }
    }
  }
  return sitemapUrls;
}
export const sitemapExistsRule = defineRule({
  id: "technical-sitemap-exists",
  name: "Sitemap Exists",
  description: "Checks that a sitemap.xml exists at /sitemap.xml or is referenced in robots.txt",
  category: "technical",
  weight: 1,
  run: async (context) => {
    const baseUrl = getBaseUrl3(context.url);
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    const robotsTxtUrl = `${baseUrl}/robots.txt`;
    const checkedLocations = [];
    const foundSitemaps = [];
    try {
      const statusCode = await fetchUrl(sitemapUrl, 1e4, context.signal);
      checkedLocations.push(sitemapUrl);
      if (statusCode === 200) {
        foundSitemaps.push(sitemapUrl);
      }
    } catch (error) {
      rethrowIfAborted(error, context.signal);
    }
    try {
      const robotsResult = await fetchPage(robotsTxtUrl, 3e4, {
        ...context.signal && { signal: context.signal }
      });
      if (robotsResult.statusCode === 200) {
        const sitemapsInRobots = extractSitemapUrlsFromRobotsTxt(robotsResult.html);
        for (const sitemapUrlFromRobots of sitemapsInRobots) {
          if (!foundSitemaps.includes(sitemapUrlFromRobots)) {
            checkedLocations.push(sitemapUrlFromRobots);
            try {
              const statusCode = await fetchUrl(sitemapUrlFromRobots, 1e4, context.signal);
              if (statusCode === 200) {
                foundSitemaps.push(sitemapUrlFromRobots);
              }
            } catch (error) {
              rethrowIfAborted(error, context.signal);
            }
          }
        }
      }
    } catch (error) {
      rethrowIfAborted(error, context.signal);
    }
    if (foundSitemaps.length > 0) {
      return pass(
        "technical-sitemap-exists",
        `Sitemap found: ${foundSitemaps.length} sitemap(s) accessible`,
        {
          foundSitemaps,
          checkedLocations
        }
      );
    }
    if (checkedLocations.length === 1) {
      return fail(
        "technical-sitemap-exists",
        "No sitemap.xml found at default location and no sitemap referenced in robots.txt",
        {
          checkedLocations,
          foundSitemaps: []
        }
      );
    }
    return warn(
      "technical-sitemap-exists",
      `Sitemap referenced in robots.txt but not accessible (checked ${checkedLocations.length} locations)`,
      {
        checkedLocations,
        foundSitemaps: []
      }
    );
  }
});
