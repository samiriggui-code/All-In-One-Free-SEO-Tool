import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const LOCAL_PATH_PREFIXES = [
  "/Users/",
  "/home/",
  "C:\\",
  "C:/",
  "D:\\",
  "D:/"
];
export const localFileRule = defineRule({
  id: "links-local-file",
  name: "No Local File References",
  description: "Checks for file:// protocol links and absolute OS filesystem paths in href/src attributes",
  category: "links",
  weight: 8,
  run: (context) => {
    const found: { element: string; href: string; reason: string; }[] = [];
    context.$('[href^="file://"], [src^="file://"]').each((_i, el) => {
      const node = context.$(el);
      const href = node.attr("href") || node.attr("src") || "";
      const tag = el.tagName || "unknown";
      found.push({ element: tag, href, reason: "file:// protocol" });
    });
    context.$("[href], [src]").each((_i, el) => {
      const node = context.$(el);
      const href = node.attr("href") || node.attr("src") || "";
      if (!href) return;
      for (const prefix of LOCAL_PATH_PREFIXES) {
        if (href.startsWith(prefix)) {
          const tag = el.tagName || "unknown";
          const alreadyCaptured = found.some(
            (f) => f.href === href && f.element === tag
          );
          if (!alreadyCaptured) {
            found.push({ element: tag, href, reason: "absolute OS path" });
          }
          break;
        }
      }
    });
    if (found.length > 0) {
      return fail(
        "links-local-file",
        `Found ${found.length} local file reference(s)`,
        {
          localFileCount: found.length,
          localFiles: found.slice(0, 10),
          recommendation: "Replace local file references with proper relative or absolute HTTP/HTTPS URLs"
        }
      );
    }
    return pass(
      "links-local-file",
      "No local file references found"
    );
  }
});
