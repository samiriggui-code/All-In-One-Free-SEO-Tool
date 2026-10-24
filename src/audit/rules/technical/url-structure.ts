import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const MAX_URL_PATH_LENGTH = 100;
export const MAX_URL_TOTAL_LENGTH = 2048;
export function analyzeUrlStructure(url: string) {
  const issues = [];
  try {
    const urlObj = new URL(url);
    const path3 = urlObj.pathname;
    const pathLength = path3.length;
    const totalLength = url.length;
    const hasUnderscores = path3.includes("_");
    if (hasUnderscores) {
      issues.push("URL contains underscores (use hyphens instead)");
    }
    const hasUppercase = path3 !== path3.toLowerCase();
    if (hasUppercase) {
      issues.push("URL contains uppercase letters (should be lowercase)");
    }
    if (pathLength > MAX_URL_PATH_LENGTH) {
      issues.push(
        `URL path is ${pathLength} characters (recommended max: ${MAX_URL_PATH_LENGTH})`
      );
    }
    if (totalLength > MAX_URL_TOTAL_LENGTH) {
      issues.push(
        `Total URL length is ${totalLength} characters (max: ${MAX_URL_TOTAL_LENGTH})`
      );
    }
    if (/--+/.test(path3)) {
      issues.push("URL contains multiple consecutive hyphens");
    }
    const specialChars = path3.match(/[^a-zA-Z0-9\-_./]/g);
    if (specialChars && specialChars.length > 0) {
      const uniqueChars = [...new Set(specialChars)].join(", ");
      issues.push(`URL contains special characters: ${uniqueChars}`);
    }
    if (/\.(php|asp|aspx|jsp|cgi)\??/i.test(path3)) {
      issues.push("URL contains server-side file extension (consider clean URLs)");
    }
    if (urlObj.search.length > 0) {
      const paramCount = urlObj.searchParams.size;
      if (paramCount > 3) {
        issues.push(`URL has ${paramCount} query parameters (may impact crawlability)`);
      }
    }
    return {
      hasUnderscores,
      hasUppercase,
      pathLength,
      totalLength,
      issues,
      path: path3
    };
  } catch {
    return {
      hasUnderscores: false,
      hasUppercase: false,
      pathLength: 0,
      totalLength: url.length,
      issues: ["Could not parse URL"],
      path: ""
    };
  }
}
export const urlStructureRule = defineRule({
  id: "technical-url-structure",
  name: "URL Structure",
  description: "Checks that URL uses hyphens (not underscores), is lowercase, and has reasonable length",
  category: "technical",
  weight: 1,
  run: async (context) => {
    const { url } = context;
    const analysis = analyzeUrlStructure(url);
    if (analysis.issues.length === 0) {
      return pass(
        "technical-url-structure",
        "URL follows SEO best practices",
        {
          url,
          path: analysis.path,
          pathLength: analysis.pathLength,
          totalLength: analysis.totalLength
        }
      );
    }
    const hasCriticalIssues = analysis.hasUnderscores || analysis.hasUppercase;
    if (hasCriticalIssues) {
      return fail(
        "technical-url-structure",
        `URL has structural issues: ${analysis.issues.join("; ")}`,
        {
          url,
          path: analysis.path,
          pathLength: analysis.pathLength,
          totalLength: analysis.totalLength,
          issues: analysis.issues
        }
      );
    }
    return warn(
      "technical-url-structure",
      `URL has minor structural issues: ${analysis.issues.join("; ")}`,
      {
        url,
        path: analysis.path,
        pathLength: analysis.pathLength,
        totalLength: analysis.totalLength,
        issues: analysis.issues
      }
    );
  }
});
