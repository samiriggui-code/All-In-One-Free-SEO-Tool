import type { CheerioAPI } from "cheerio";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { fetchPage } from "@/audit/crawler/fetcher";

export function getBaseUrl7(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return url;
  }
}
export function normalizeUrl7(url: string) {
  try {
    const urlObj = new URL(url);
    let path3 = urlObj.pathname;
    if (path3.length > 1 && path3.endsWith("/")) {
      path3 = path3.slice(0, -1);
    }
    return `${urlObj.protocol}//${urlObj.host.toLowerCase()}${path3}`;
  } catch {
    return url.toLowerCase().replace(/\/$/, "");
  }
}
export function hasNoindex2($: CheerioAPI, headers: Record<string, string>) {
  const robotsMeta = $('meta[name="robots"]').attr("content") || "";
  if (/noindex/i.test(robotsMeta)) {
    return true;
  }
  const googlebotMeta = $('meta[name="googlebot"]').attr("content") || "";
  if (/noindex/i.test(googlebotMeta)) {
    return true;
  }
  const xRobotsTag = headers["x-robots-tag"] || headers["X-Robots-Tag"] || "";
  if (/noindex/i.test(xRobotsTag)) {
    return true;
  }
  return false;
}
export function extractSitemapUrlsFromRobotsTxt4(content: string) {
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
export function extractUrlsFromSitemap2(content: string) {
  const urls = [];
  const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(content)) !== null) {
    const url = match[1].trim();
    if (url) {
      urls.push(url);
    }
  }
  return urls;
}
export function isSitemapIndex2(content: string) {
  return /<sitemapindex[\s>]/i.test(content);
}
export const noindexInSitemapRule = defineRule({
  id: "crawl-noindex-in-sitemap",
  name: "Noindex in Sitemap",
  description: "Checks for noindexed pages listed in sitemap",
  category: "crawl",
  weight: 15,
  run: async (context) => {
    const { $, url, headers } = context;
    const isNoindexed = hasNoindex2($, headers);
    if (!isNoindexed) {
      return pass(
        "crawl-noindex-in-sitemap",
        "Page is indexable (no noindex directive)",
        { isNoindexed: false }
      );
    }
    const baseUrl = getBaseUrl7(url);
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    const robotsTxtUrl = `${baseUrl}/robots.txt`;
    let sitemapContent = null;
    let fetchedSitemapUrl = sitemapUrl;
    try {
      const result = await fetchPage(sitemapUrl);
      if (result.statusCode === 200) {
        sitemapContent = result.html;
      }
    } catch {
    }
    if (!sitemapContent) {
      try {
        const robotsResult = await fetchPage(robotsTxtUrl);
        if (robotsResult.statusCode === 200) {
          const sitemapsInRobots = extractSitemapUrlsFromRobotsTxt4(robotsResult.html);
          if (sitemapsInRobots.length > 0) {
            fetchedSitemapUrl = sitemapsInRobots[0];
            const result = await fetchPage(fetchedSitemapUrl);
            if (result.statusCode === 200) {
              sitemapContent = result.html;
            }
          }
        }
      } catch {
      }
    }
    if (!sitemapContent) {
      return warn(
        "crawl-noindex-in-sitemap",
        "Page has noindex but could not verify sitemap status",
        {
          isNoindexed: true,
          sitemapChecked: false,
          checkedUrls: [sitemapUrl, robotsTxtUrl]
        }
      );
    }
    const isIndex = isSitemapIndex2(sitemapContent);
    let allSitemapUrls = [];
    if (isIndex) {
      const childSitemapUrls = extractUrlsFromSitemap2(sitemapContent);
      for (const childUrl of childSitemapUrls.slice(0, 3)) {
        try {
          const childResult = await fetchPage(childUrl);
          if (childResult.statusCode === 200 && !isSitemapIndex2(childResult.html)) {
            const urls = extractUrlsFromSitemap2(childResult.html);
            allSitemapUrls.push(...urls);
          }
        } catch {
        }
      }
    } else {
      allSitemapUrls = extractUrlsFromSitemap2(sitemapContent);
    }
    const normalizedCurrentUrl = normalizeUrl7(url);
    const isInSitemap = allSitemapUrls.some(
      (sitemapEntry) => normalizeUrl7(sitemapEntry) === normalizedCurrentUrl
    );
    if (isInSitemap) {
      return fail(
        "crawl-noindex-in-sitemap",
        "Page has noindex directive but is listed in sitemap (conflicting signals)",
        {
          isNoindexed: true,
          isInSitemap: true,
          sitemapUrl: fetchedSitemapUrl,
          isSitemapIndex: isIndex,
          impact: "Sitemaps indicate pages should be indexed; noindex contradicts this",
          recommendation: "Either remove the page from sitemap or remove the noindex directive"
        }
      );
    }
    return pass(
      "crawl-noindex-in-sitemap",
      "Page has noindex and is not in sitemap (consistent)",
      {
        isNoindexed: true,
        isInSitemap: false,
        sitemapUrl: fetchedSitemapUrl,
        urlsChecked: allSitemapUrls.length
      }
    );
  }
});
