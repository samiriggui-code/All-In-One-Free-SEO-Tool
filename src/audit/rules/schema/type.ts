import type { JsonLd, JsonLdObject } from "@/audit/rules/schema/utils";
import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const COMMON_SCHEMA_TYPES = [
  "Article",
  "NewsArticle",
  "BlogPosting",
  "Product",
  "Organization",
  "Person",
  "LocalBusiness",
  "WebPage",
  "WebSite",
  "BreadcrumbList",
  "FAQPage",
  "HowTo",
  "Recipe",
  "Event",
  "Review",
  "VideoObject",
  "ImageObject",
  "Course",
  "Book",
  "SoftwareApplication",
  "JobPosting"
];
export function extractTypes(data: JsonLd): string[] {
  const types: string[] = [];
  if (!data || typeof data !== "object") {
    return types;
  }
  const obj: JsonLdObject = data;
  if (obj["@type"]) {
    if (Array.isArray(obj["@type"])) {
      types.push(...obj["@type"]);
    } else if (typeof obj["@type"] === "string") {
      types.push(obj["@type"]);
    }
  }
  if (Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"]) {
      types.push(...extractTypes(item));
    }
  }
  return types;
}
export const structuredDataTypeRule = defineRule({
  id: "schema-type",
  name: "Structured Data Type Present",
  description: "Checks that JSON-LD structured data includes the required @type field",
  category: "schema",
  weight: 25,
  run: async (context) => {
    const { $ } = context;
    const jsonLdScripts = $('script[type="application/ld+json"]');
    if (jsonLdScripts.length === 0) {
      return notMeasured("schema-type", "No JSON-LD to check (schema-present reports its absence)", {
        found: false
      });
    }
    const allTypes: string[] = [];
    let scriptsWithType = 0;
    let scriptsWithoutType = 0;
    let parseErrors = 0;
    jsonLdScripts.each((index, element) => {
      const rawContent = $(element).html() || "";
      const trimmedContent = rawContent.trim();
      if (!trimmedContent) {
        parseErrors++;
        return;
      }
      try {
        const parsed = JSON.parse(trimmedContent);
        const types = extractTypes(parsed);
        if (types.length > 0) {
          allTypes.push(...types);
          scriptsWithType++;
        } else {
          scriptsWithoutType++;
        }
      } catch {
        parseErrors++;
      }
    });
    const recognizedTypes = allTypes.filter(
      (t: string) => COMMON_SCHEMA_TYPES.includes(t)
    );
    const uniqueTypes = [...new Set(allTypes)];
    if (scriptsWithType === 0 && parseErrors === 0) {
      return fail(
        "schema-type",
        "No JSON-LD scripts contain a @type field",
        {
          totalScripts: jsonLdScripts.length,
          scriptsWithType: 0,
          scriptsWithoutType,
          parseErrors
        }
      );
    }
    if (scriptsWithType === 0 && parseErrors > 0) {
      return fail(
        "schema-type",
        "Could not check @type - all JSON-LD scripts have parse errors",
        {
          totalScripts: jsonLdScripts.length,
          scriptsWithType: 0,
          scriptsWithoutType,
          parseErrors
        }
      );
    }
    if (scriptsWithoutType > 0 || parseErrors > 0) {
      return warn(
        "schema-type",
        `${scriptsWithType} of ${jsonLdScripts.length} JSON-LD script(s) have @type, found: ${uniqueTypes.join(", ")}`,
        {
          totalScripts: jsonLdScripts.length,
          scriptsWithType,
          scriptsWithoutType,
          parseErrors,
          types: uniqueTypes,
          recognizedTypes
        }
      );
    }
    return pass(
      "schema-type",
      `All ${scriptsWithType} JSON-LD script(s) have @type: ${uniqueTypes.join(", ")}`,
      {
        totalScripts: jsonLdScripts.length,
        scriptsWithType,
        types: uniqueTypes,
        recognizedTypes
      }
    );
  }
});
