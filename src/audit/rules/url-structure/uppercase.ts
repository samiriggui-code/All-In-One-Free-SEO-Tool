import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const uppercaseRule = defineRule({
  id: "url-uppercase",
  name: "Uppercase Letters in URL",
  description: "Checks if URL path contains uppercase letters which can cause duplicate content issues",
  category: "url",
  weight: 5,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const uppercaseChars = pathname.match(/[A-Z]/g);
      if (!uppercaseChars || uppercaseChars.length === 0) {
        return pass("url-uppercase", "URL path is all lowercase", {
          url,
          path: pathname
        });
      }
      const uniqueUppercase = [...new Set(uppercaseChars)];
      return warn(
        "url-uppercase",
        `URL path contains ${uppercaseChars.length} uppercase character(s): ${uniqueUppercase.join(", ")}`,
        {
          url,
          path: pathname,
          uppercaseCharacters: uniqueUppercase,
          uppercaseCount: uppercaseChars.length,
          fix: `Change URL to lowercase: ${pathname.toLowerCase()}`
        }
      );
    } catch {
      return pass("url-uppercase", "Could not parse URL", { url });
    }
  }
});
