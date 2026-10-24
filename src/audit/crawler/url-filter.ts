import type { UrlFilterOptions } from "@/audit/types";

export function globToRegex(pattern: string) {
  let regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  regexStr = regexStr.replace(/\*\*/g, "\0GLOBSTAR\0");
  regexStr = regexStr.replace(/\*/g, "[^/]*");
  regexStr = regexStr.replace(/\?/g, ".");
  regexStr = regexStr.replace(/\x00GLOBSTAR\x00/g, ".*");
  if (pattern.endsWith("/**")) {
    const basePattern = regexStr.slice(0, -3);
    regexStr = `${basePattern}(/.*)?`;
  }
  return new RegExp(`^${regexStr}$`);
}
export class UrlFilter {
  includePatterns: RegExp[];
  excludePatterns: RegExp[];
  allowQueryParams: Set<string>;
  dropQueryPrefixes: string[];
  constructor(options: Partial<UrlFilterOptions> = {}) {
    this.includePatterns = (options.include ?? []).map(globToRegex);
    this.excludePatterns = (options.exclude ?? []).map(globToRegex);
    this.allowQueryParams = new Set(options.allowQueryParams ?? []);
    this.dropQueryPrefixes = options.dropQueryPrefixes ?? ["utm_", "gclid", "fbclid", "mc_", "_ga"];
  }
  /**
   * Check if a URL should be crawled based on include/exclude patterns
   * @param url - Full URL or pathname to check
   * @returns true if the URL should be crawled
   */
  shouldCrawl(url: string) {
    let pathname: string;
    try {
      const urlObj = new URL(url);
      pathname = urlObj.pathname;
    } catch {
      pathname = url.startsWith("/") ? url : `/${url}`;
    }
    if (this.includePatterns.length > 0) {
      const matchesInclude = this.includePatterns.some((pattern) => pattern.test(pathname));
      if (!matchesInclude) {
        return false;
      }
    }
    if (this.excludePatterns.length > 0) {
      const matchesExclude = this.excludePatterns.some((pattern) => pattern.test(pathname));
      if (matchesExclude) {
        return false;
      }
    }
    return true;
  }
  /**
   * Normalize a URL by removing unwanted query parameters
   * @param url - URL to normalize
   * @returns Normalized URL string
   */
  normalizeUrl(url: string) {
    try {
      const urlObj = new URL(url);
      urlObj.hash = "";
      const paramsToDelete: string[] = [];
      urlObj.searchParams.forEach((_, key) => {
        const shouldDropByPrefix = this.dropQueryPrefixes.some(
          (prefix: string) => key.toLowerCase().startsWith(prefix.toLowerCase())
        );
        if (this.allowQueryParams.size > 0) {
          if (!this.allowQueryParams.has(key)) {
            paramsToDelete.push(key);
          }
        } else if (shouldDropByPrefix) {
          paramsToDelete.push(key);
        }
      });
      for (const key of paramsToDelete) {
        urlObj.searchParams.delete(key);
      }
      urlObj.searchParams.sort();
      let normalized = urlObj.href;
      if (normalized.endsWith("/") && urlObj.pathname !== "/") {
        normalized = normalized.slice(0, -1);
      }
      return normalized;
    } catch {
      return url;
    }
  }
  /**
   * Check if URL matches a specific pattern
   * @param url - URL or pathname to check
   * @param pattern - Glob pattern to match against
   * @returns true if URL matches the pattern
   */
  matchesPattern(url: string, pattern: string) {
    let pathname: string;
    try {
      const urlObj = new URL(url);
      pathname = urlObj.pathname;
    } catch {
      pathname = url.startsWith("/") ? url : `/${url}`;
    }
    const regex = globToRegex(pattern);
    return regex.test(pathname);
  }
}
