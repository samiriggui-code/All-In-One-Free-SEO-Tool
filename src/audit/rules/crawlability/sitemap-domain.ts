import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { fetchPage } from "@/audit/crawler/fetcher";

export function getBaseUrl6(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return url;
  }
}
export function getHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}
export function extractSitemapUrlsFromRobotsTxt3(content: string) {
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
export function extractUrlsFromSitemap(content: string) {
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
export function isSitemapIndex(content: string) {
  return /<sitemapindex[\s>]/i.test(content);
}
export const sitemapDomainRule = defineRule({
  id: "crawl-sitemap-domain",
  name: "Sitemap Domain Validation",
  description: "Checks that all sitemap URLs belong to the expected domain",
  category: "crawl",
  weight: 15,
  run: async (context) => {
    const baseUrl = getBaseUrl6(context.url);
    const expectedHostname = getHostname(baseUrl);
    if (!expectedHostname) {
      return fail(
        "crawl-sitemap-domain",
        "Could not determine expected domain from URL",
        { url: context.url }
      );
    }
    const acceptableHostnames = /* @__PURE__ */ new Set();
    acceptableHostnames.add(expectedHostname);
    if (expectedHostname.startsWith("www.")) {
      acceptableHostnames.add(expectedHostname.substring(4));
    } else {
      acceptableHostnames.add("www." + expectedHostname);
    }
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    const robotsTxtUrl = `${baseUrl}/robots.txt`;
    let sitemapUrls;
    let isIndex;
    let fetchedSitemapUrl = sitemapUrl;
    if (context.sitemapContent !== void 0 && context.sitemapUrls) {
      sitemapUrls = context.sitemapUrls;
      isIndex = context.sitemapIsIndex ?? false;
      fetchedSitemapUrl = context.sitemapDocuments?.[0]?.url ?? sitemapUrl;
    } else {
      let sitemapContent = null;
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
            const sitemapsInRobots = extractSitemapUrlsFromRobotsTxt3(robotsResult.html);
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
          "crawl-sitemap-domain",
          "Could not find sitemap to validate",
          { checkedUrls: [sitemapUrl, robotsTxtUrl] }
        );
      }
      sitemapUrls = extractUrlsFromSitemap(sitemapContent);
      isIndex = isSitemapIndex(sitemapContent);
    }
    if (sitemapUrls.length === 0) {
      return warn(
        "crawl-sitemap-domain",
        isIndex ? "Sitemap index contains no sitemap URLs" : "Sitemap contains no page URLs",
        { sitemapUrl: fetchedSitemapUrl, isSitemapIndex: isIndex }
      );
    }
    const invalidDomainUrls = [];
    for (const url of sitemapUrls) {
      const hostname = getHostname(url);
      if (hostname && !acceptableHostnames.has(hostname)) {
        invalidDomainUrls.push({ url, hostname });
      }
    }
    const details = {
      sitemapUrl: fetchedSitemapUrl,
      isSitemapIndex: isIndex,
      totalUrls: sitemapUrls.length,
      expectedHostnames: Array.from(acceptableHostnames),
      invalidCount: invalidDomainUrls.length,
      invalidDomainUrls: invalidDomainUrls.slice(0, 10)
      // Limit to first 10
    };
    if (invalidDomainUrls.length === 0) {
      return pass(
        "crawl-sitemap-domain",
        `All ${sitemapUrls.length} sitemap URLs belong to the expected domain`,
        details
      );
    }
    const invalidPercent = invalidDomainUrls.length / sitemapUrls.length * 100;
    if (invalidPercent > 10) {
      return fail(
        "crawl-sitemap-domain",
        `${invalidDomainUrls.length} of ${sitemapUrls.length} sitemap URLs (${invalidPercent.toFixed(1)}%) have incorrect domain`,
        {
          ...details,
          impact: "Search engines will ignore URLs that do not match the sitemap domain",
          recommendation: "Remove cross-domain URLs from the sitemap or fix incorrect domain formatting"
        }
      );
    }
    return warn(
      "crawl-sitemap-domain",
      `${invalidDomainUrls.length} sitemap URL(s) have different domain than expected`,
      {
        ...details,
        recommendation: "Review and remove cross-domain URLs from the sitemap"
      }
    );
  }
});
