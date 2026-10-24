import { defineRule, fail, pass } from "@/audit/engine/define-rule";
import { fetchUrl } from "@/audit/crawler/fetcher";
import { rethrowIfAborted } from "@/audit/engine/errors";

export function getBaseUrl(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return url;
  }
}
export const robotsTxtExistsRule = defineRule({
  id: "technical-robots-txt-exists",
  name: "Robots.txt Exists",
  description: "Checks that the site has a robots.txt file accessible at /robots.txt",
  category: "technical",
  weight: 1,
  run: async (context) => {
    const baseUrl = getBaseUrl(context.url);
    const robotsTxtUrl = `${baseUrl}/robots.txt`;
    try {
      const statusCode = await fetchUrl(robotsTxtUrl, 1e4, context.signal);
      if (statusCode === 200) {
        return pass(
          "technical-robots-txt-exists",
          "robots.txt file exists and is accessible",
          { url: robotsTxtUrl, statusCode }
        );
      }
      if (statusCode === 0) {
        return fail(
          "technical-robots-txt-exists",
          "Could not connect to robots.txt (timeout or network error)",
          { url: robotsTxtUrl, statusCode }
        );
      }
      return fail(
        "technical-robots-txt-exists",
        `robots.txt returned HTTP ${statusCode} (expected 200)`,
        { url: robotsTxtUrl, statusCode }
      );
    } catch (error) {
      rethrowIfAborted(error, context.signal);
      const message = error instanceof Error ? error.message : String(error);
      return fail(
        "technical-robots-txt-exists",
        `Failed to check robots.txt: ${message}`,
        { url: robotsTxtUrl, error: message }
      );
    }
  }
});
