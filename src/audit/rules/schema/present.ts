import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const structuredDataPresentRule = defineRule({
  id: "schema-present",
  name: "Structured Data Present",
  description: "Checks that JSON-LD or microdata structured data exists on the page",
  category: "schema",
  weight: 25,
  run: async (context) => {
    const { $ } = context;
    const jsonLdScripts = $('script[type="application/ld+json"]');
    const hasJsonLd = jsonLdScripts.length > 0;
    const microdataElements = $("[itemscope]");
    const hasMicrodata = microdataElements.length > 0;
    const rdfaElements = $("[typeof]");
    const hasRdfa = rdfaElements.length > 0;
    if (!hasJsonLd && !hasMicrodata && !hasRdfa) {
      return fail(
        "schema-present",
        "No structured data found on the page (JSON-LD, microdata, or RDFa)",
        {
          jsonLdCount: 0,
          microdataCount: 0,
          rdfaCount: 0
        }
      );
    }
    const formats = [];
    if (hasJsonLd) formats.push("JSON-LD");
    if (hasMicrodata) formats.push("Microdata");
    if (hasRdfa) formats.push("RDFa");
    if (hasJsonLd) {
      return pass(
        "schema-present",
        `Structured data found: ${formats.join(", ")}`,
        {
          jsonLdCount: jsonLdScripts.length,
          microdataCount: microdataElements.length,
          rdfaCount: rdfaElements.length,
          formats
        }
      );
    }
    return warn(
      "schema-present",
      `Structured data found (${formats.join(", ")}), but consider using JSON-LD for better compatibility`,
      {
        jsonLdCount: 0,
        microdataCount: microdataElements.length,
        rdfaCount: rdfaElements.length,
        formats,
        recommendation: "JSON-LD is recommended over microdata and RDFa"
      }
    );
  }
});
