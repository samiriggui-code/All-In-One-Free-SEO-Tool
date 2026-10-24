import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function analyzeTrailingSlashes(currentUrl: string, internalLinks: string[]) {
  let currentPath = "";
  try {
    currentPath = new URL(currentUrl).pathname;
  } catch {
  }
  const currentHasTrailingSlash = currentPath.length > 1 && currentPath.endsWith("/");
  const forms = /* @__PURE__ */ new Map();
  for (const link of internalLinks) {
    try {
      const path3 = new URL(link).pathname;
      if (path3 === "/" || /\.\w+$/.test(path3) || path3 === currentPath) {
        continue;
      }
      const key = path3.endsWith("/") ? path3.slice(0, -1) : path3;
      const seen = forms.get(key) ?? /* @__PURE__ */ new Set();
      seen.add(path3.endsWith("/") ? "slash" : "none");
      forms.set(key, seen);
    } catch {
    }
  }
  const withSlash = [];
  const withoutSlash = [];
  const conflictingPaths = [];
  for (const [key, seen] of forms) {
    if (seen.has("slash")) withSlash.push(`${key}/`);
    if (seen.has("none")) withoutSlash.push(key);
    if (seen.size > 1) conflictingPaths.push(key);
  }
  const dominantStyle = withSlash.length === 0 && withoutSlash.length > 0 ? "without-slash" : withoutSlash.length === 0 && withSlash.length > 0 ? "with-slash" : "mixed";
  return { currentHasTrailingSlash, withSlash, withoutSlash, conflictingPaths, dominantStyle };
}
export const trailingSlashRule = defineRule({
  id: "technical-trailing-slash",
  name: "Trailing Slash Consistency",
  description: "Checks for consistent trailing slash usage across internal links",
  category: "technical",
  weight: 1,
  run: async (context) => {
    const { url, links } = context;
    const internalLinks = links.filter((link) => link.isInternal).map((link) => link.href);
    const analysis = analyzeTrailingSlashes(url, internalLinks);
    const details = {
      url,
      currentHasTrailingSlash: analysis.currentHasTrailingSlash,
      withSlashCount: analysis.withSlash.length,
      withoutSlashCount: analysis.withoutSlash.length,
      dominantStyle: analysis.dominantStyle,
      sampleWithSlash: analysis.withSlash.slice(0, 3),
      sampleWithoutSlash: analysis.withoutSlash.slice(0, 3)
    };
    if (analysis.conflictingPaths.length === 0) {
      const total = analysis.withSlash.length + analysis.withoutSlash.length;
      return pass(
        "technical-trailing-slash",
        total === 0 ? "Trailing slash usage is consistent (no internal paths to analyze)" : `Each internal path is linked in one form (${analysis.withSlash.length} with a trailing slash, ${analysis.withoutSlash.length} without)`,
        details
      );
    }
    return warn(
      "technical-trailing-slash",
      `${analysis.conflictingPaths.length} path(s) linked both with and without a trailing slash: ${analysis.conflictingPaths.slice(0, 3).join(", ")}`,
      {
        ...details,
        conflictingPaths: analysis.conflictingPaths.slice(0, 10),
        recommendation: "Link each page in the form the server serves, and redirect the other form to it"
      }
    );
  }
});
