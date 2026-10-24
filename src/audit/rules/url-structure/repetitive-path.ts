import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const repetitivePathRule = defineRule({
  id: "url-repetitive-path",
  name: "Repetitive Path Segments",
  description: "Checks for consecutive duplicate segments in the URL path (e.g., /blog/blog/)",
  category: "url",
  weight: 4,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split("/").filter((s) => s.length > 0).map((s) => s.toLowerCase());
      const duplicates = [];
      for (let i = 1; i < segments.length; i++) {
        if (segments[i] === segments[i - 1]) {
          duplicates.push(segments[i]);
        }
      }
      if (duplicates.length === 0) {
        return pass(
          "url-repetitive-path",
          "URL path has no repetitive segments",
          { url, path: pathname, segments }
        );
      }
      const uniqueDuplicates = [...new Set(duplicates)];
      return fail(
        "url-repetitive-path",
        `URL path contains repetitive segments: ${uniqueDuplicates.map((d) => `/${d}/${d}/`).join(", ")}`,
        {
          url,
          path: pathname,
          segments,
          repeatedSegments: uniqueDuplicates,
          fix: "Remove duplicate consecutive path segments"
        }
      );
    } catch {
      return pass("url-repetitive-path", "Could not parse URL", { url });
    }
  }
});
