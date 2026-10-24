import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const resourceRedirectRule = defineRule({
  id: "redirect-resource",
  name: "No HTTP Resource Redirects",
  description: "Checks that HTTPS pages do not reference HTTP resources that cause redirect chains",
  category: "redirect",
  weight: 10,
  run: (context) => {
    const { $, url } = context;
    if (!url.startsWith("https://")) {
      return pass("redirect-resource", "Page is not HTTPS; resource redirect check not applicable");
    }
    const httpResources: { type: string; url: string; }[] = [];
    $('link[rel="stylesheet"][href^="http://"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        httpResources.push({ type: "stylesheet", url: href });
      }
    });
    $('script[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        httpResources.push({ type: "script", url: src });
      }
    });
    $('img[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        httpResources.push({ type: "image", url: src });
      }
    });
    if (httpResources.length === 0) {
      return pass("redirect-resource", "No HTTP resources found on HTTPS page");
    }
    const byType = httpResources.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return warn(
      "redirect-resource",
      `Found ${httpResources.length} HTTP resource(s) on HTTPS page that likely cause redirect chains`,
      {
        totalHttpResources: httpResources.length,
        byType,
        resources: httpResources.slice(0, 20),
        recommendation: "Update resource URLs to use HTTPS to avoid unnecessary redirects"
      }
    );
  }
});
