import type { JsonLd } from "@/audit/rules/schema/utils";
import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const structuredDataValidRule = defineRule({
  id: "schema-valid",
  name: "Structured Data Valid JSON",
  description: "Checks that all JSON-LD scripts contain valid, parseable JSON",
  category: "schema",
  weight: 25,
  run: async (context) => {
    const { $ } = context;
    const jsonLdScripts = $('script[type="application/ld+json"]');
    if (jsonLdScripts.length === 0) {
      return notMeasured("schema-valid", "No JSON-LD to check (schema-present reports its absence)", {
        found: false
      });
    }
    const parseResults: { index: number; valid: boolean; error?: string; raw: string; data?: JsonLd; }[] = [];
    let validCount = 0;
    let invalidCount = 0;
    jsonLdScripts.each((index, element) => {
      const rawContent = $(element).html() || "";
      const trimmedContent = rawContent.trim();
      if (!trimmedContent) {
        parseResults.push({
          index,
          valid: false,
          error: "Empty JSON-LD script",
          raw: rawContent
        });
        invalidCount++;
        return;
      }
      try {
        const parsed = JSON.parse(trimmedContent);
        parseResults.push({
          index,
          valid: true,
          data: parsed,
          raw: trimmedContent.substring(0, 200)
          // Truncate for details
        });
        validCount++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown parse error";
        parseResults.push({
          index,
          valid: false,
          error: errorMessage,
          raw: trimmedContent.substring(0, 200)
          // Truncate for details
        });
        invalidCount++;
      }
    });
    if (invalidCount === 0) {
      return pass(
        "schema-valid",
        `All ${validCount} JSON-LD script(s) contain valid JSON`,
        {
          totalScripts: jsonLdScripts.length,
          validCount,
          invalidCount: 0
        }
      );
    }
    const invalidDetails = parseResults.filter((r) => !r.valid).map((r) => ({
      scriptIndex: r.index,
      error: r.error
    }));
    if (validCount === 0) {
      return fail(
        "schema-valid",
        `All ${invalidCount} JSON-LD script(s) contain invalid JSON`,
        {
          totalScripts: jsonLdScripts.length,
          validCount: 0,
          invalidCount,
          invalidScripts: invalidDetails
        }
      );
    }
    return warn(
      "schema-valid",
      `${invalidCount} of ${jsonLdScripts.length} JSON-LD script(s) contain invalid JSON`,
      {
        totalScripts: jsonLdScripts.length,
        validCount,
        invalidCount,
        invalidScripts: invalidDetails
      }
    );
  }
});
