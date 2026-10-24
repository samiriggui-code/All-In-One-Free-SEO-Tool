import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { fetchPage } from "@/audit/crawler/fetcher";

export function getBaseUrl4(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return url;
  }
}
export function extractSitemapUrlsFromRobotsTxt2(content: string) {
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
export function validateSitemapXml(content: string) {
  const issues = [];
  let isSitemapIndex4 = false;
  let urlCount = 0;
  const trimmedContent = content.trim();
  if (!trimmedContent.startsWith("<?xml") && !trimmedContent.startsWith("<")) {
    issues.push("Content does not appear to be valid XML");
    return { isValid: false, isSitemapIndex: false, urlCount: 0, issues };
  }
  const hasUrlsetTag = /<urlset[\s>]/i.test(content);
  const hasSitemapindexTag = /<sitemapindex[\s>]/i.test(content);
  if (!hasUrlsetTag && !hasSitemapindexTag) {
    issues.push("Missing <urlset> or <sitemapindex> root element");
    return { isValid: false, isSitemapIndex: false, urlCount: 0, issues };
  }
  isSitemapIndex4 = hasSitemapindexTag;
  if (isSitemapIndex4) {
    const sitemapMatches = content.match(/<sitemap[\s>]/gi);
    urlCount = sitemapMatches ? sitemapMatches.length : 0;
    const locMatches = content.match(/<loc>/gi);
    if (!locMatches || locMatches.length === 0) {
      issues.push("Sitemap index contains no <loc> tags");
    }
  } else {
    const urlMatches = content.match(/<url[\s>]/gi);
    urlCount = urlMatches ? urlMatches.length : 0;
    const locMatches = content.match(/<loc>/gi);
    if (!locMatches || locMatches.length === 0) {
      issues.push("Sitemap contains no <loc> tags");
    }
    if (urlCount === 0) {
      issues.push("Sitemap contains no <url> entries");
    }
  }
  if (hasUrlsetTag && !/<\/urlset>/i.test(content)) {
    issues.push("Missing closing </urlset> tag");
  }
  if (hasSitemapindexTag && !/<\/sitemapindex>/i.test(content)) {
    issues.push("Missing closing </sitemapindex> tag");
  }
  const hasSitemapNamespace = /xmlns\s*=\s*["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap/i.test(content);
  if (!hasSitemapNamespace) {
    issues.push(
      'Missing sitemap namespace (xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")'
    );
  }
  return {
    isValid: issues.length === 0,
    isSitemapIndex: isSitemapIndex4,
    urlCount,
    issues
  };
}
export const sitemapValidRule = defineRule({
  id: "technical-sitemap-valid",
  name: "Sitemap Valid Structure",
  description: "Checks that the sitemap has valid XML structure with proper elements",
  category: "technical",
  weight: 1,
  run: async (context) => {
    const baseUrl = getBaseUrl4(context.url);
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    const robotsTxtUrl = `${baseUrl}/robots.txt`;
    let sitemapContent = null;
    let validatedUrl = sitemapUrl;
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
          const sitemapsInRobots = extractSitemapUrlsFromRobotsTxt2(robotsResult.html);
          if (sitemapsInRobots.length > 0) {
            validatedUrl = sitemapsInRobots[0];
            const result = await fetchPage(validatedUrl);
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
        "technical-sitemap-valid",
        "Could not find sitemap to validate",
        { checkedUrls: [sitemapUrl, robotsTxtUrl] }
      );
    }
    const validation = validateSitemapXml(sitemapContent);
    if (validation.isValid) {
      return pass(
        "technical-sitemap-valid",
        `Sitemap has valid XML structure (${validation.urlCount} ${validation.isSitemapIndex ? "sitemaps" : "URLs"})`,
        {
          url: validatedUrl,
          isSitemapIndex: validation.isSitemapIndex,
          urlCount: validation.urlCount
        }
      );
    }
    if (validation.urlCount > 0) {
      return warn(
        "technical-sitemap-valid",
        `Sitemap has ${validation.issues.length} validation issue(s) but contains ${validation.urlCount} entries`,
        {
          url: validatedUrl,
          isSitemapIndex: validation.isSitemapIndex,
          urlCount: validation.urlCount,
          issues: validation.issues
        }
      );
    }
    return fail(
      "technical-sitemap-valid",
      "Sitemap has invalid XML structure",
      {
        url: validatedUrl,
        issues: validation.issues
      }
    );
  }
});
