import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const nonAsciiRule = defineRule({
  id: "url-non-ascii",
  name: "Non-ASCII Characters in URL",
  description: "Checks for non-ASCII characters in the URL path that may cause encoding issues",
  category: "url",
  weight: 4,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      let decodedPath;
      try {
        decodedPath = decodeURIComponent(pathname);
      } catch {
        return warn(
          "url-non-ascii",
          "URL contains malformed percent-encoding",
          { url, path: pathname }
        );
      }
      const nonAsciiChars = decodedPath.match(/[^\x20-\x7E]/g);
      if (!nonAsciiChars || nonAsciiChars.length === 0) {
        return pass("url-non-ascii", "URL path contains only ASCII characters", {
          url,
          path: pathname
        });
      }
      const uniqueNonAscii = [...new Set(nonAsciiChars)];
      return warn(
        "url-non-ascii",
        `URL path contains ${nonAsciiChars.length} non-ASCII character(s): ${uniqueNonAscii.join(", ")}`,
        {
          url,
          path: pathname,
          decodedPath,
          nonAsciiCharacters: uniqueNonAscii,
          nonAsciiCount: nonAsciiChars.length,
          fix: "Replace non-ASCII characters with ASCII equivalents or transliterate"
        }
      );
    } catch {
      return pass("url-non-ascii", "Could not parse URL", { url });
    }
  }
});
