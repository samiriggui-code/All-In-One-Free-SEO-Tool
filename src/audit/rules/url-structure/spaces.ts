import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const spacesRule = defineRule({
  id: "url-spaces",
  name: "Spaces in URL",
  description: "Checks for encoded spaces (%20) or literal spaces in the URL",
  category: "url",
  weight: 6,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const search = urlObj.search;
      const fullPath = pathname + search;
      const hasEncodedSpaces = fullPath.includes("%20");
      const decodedPath = decodeURIComponent(pathname);
      const hasLiteralSpaces = decodedPath.includes(" ");
      if (hasEncodedSpaces || hasLiteralSpaces) {
        const suggestedPath = decodedPath.replace(/\s+/g, "-");
        return fail(
          "url-spaces",
          "URL contains spaces; use hyphens as word separators",
          {
            url,
            path: pathname,
            hasEncodedSpaces,
            hasLiteralSpaces,
            fix: `Replace spaces with hyphens: ${suggestedPath}`
          }
        );
      }
      return pass("url-spaces", "URL contains no spaces", {
        url,
        path: pathname
      });
    } catch {
      return pass("url-spaces", "Could not parse URL", { url });
    }
  }
});
