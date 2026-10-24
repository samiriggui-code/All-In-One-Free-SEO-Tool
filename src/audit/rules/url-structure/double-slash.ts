import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const doubleSlashRule = defineRule({
  id: "url-double-slash",
  name: "Double Slashes in URL Path",
  description: "Checks for double slashes in the URL path which indicate malformed URLs",
  category: "url",
  weight: 5,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      if (pathname.includes("//")) {
        return fail(
          "url-double-slash",
          "URL path contains double slashes",
          {
            url,
            path: pathname,
            fix: `Remove double slashes: ${pathname.replace(/\/{2,}/g, "/")}`
          }
        );
      }
      return pass("url-double-slash", "URL path has no double slashes", {
        url,
        path: pathname
      });
    } catch {
      return pass("url-double-slash", "Could not parse URL", { url });
    }
  }
});
