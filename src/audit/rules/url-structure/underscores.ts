import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const underscoresRule = defineRule({
  id: "url-underscores",
  name: "Underscores in URL",
  description: "Checks if URL path uses underscores instead of hyphens; Google recommends hyphens as word separators",
  category: "url",
  weight: 4,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      if (pathname === "/" || pathname === "") {
        return pass("url-underscores", "Root path has no underscores", {
          url,
          path: pathname
        });
      }
      const underscoreMatches = pathname.match(/_/g);
      if (!underscoreMatches || underscoreMatches.length === 0) {
        return pass("url-underscores", "URL path uses no underscores", {
          url,
          path: pathname
        });
      }
      const suggestedPath = pathname.replace(/_/g, "-");
      return warn(
        "url-underscores",
        `URL path contains ${underscoreMatches.length} underscore(s); use hyphens instead`,
        {
          url,
          path: pathname,
          underscoreCount: underscoreMatches.length,
          fix: `Replace underscores with hyphens: ${suggestedPath}`
        }
      );
    } catch {
      return pass("url-underscores", "Could not parse URL", { url });
    }
  }
});
