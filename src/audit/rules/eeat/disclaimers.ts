import { bodyText } from "@/audit/rules/content/utils/visible-text";
import { defineRule } from "@/audit/engine/define-rule";
import { detectYMYL } from "@/audit/rules/eeat/ymyl-detection";

export const DISCLAIMER_PATTERNS: Record<string, RegExp[]> = {
  medical: [
    /not\s+(a\s+)?substitute\s+for\s+(professional\s+)?(medical|health)/i,
    /consult\s+(your\s+)?(doctor|physician|healthcare\s+provider)/i,
    /not\s+(intended\s+(as|to\s+be)\s+)?medical\s+advice/i,
    /for\s+informational\s+purposes\s+only/i,
    /seek\s+(professional\s+)?medical\s+(advice|help)/i,
    /does\s+not\s+(constitute|provide)\s+medical\s+advice/i
  ],
  financial: [
    /not\s+(a\s+)?financial\s+advi(ce|sor)/i,
    /consult\s+(a\s+)?(financial\s+advisor|accountant|tax\s+professional)/i,
    /for\s+(educational|informational)\s+purposes\s+only/i,
    /past\s+performance\s+.{0,30}not\s+.{0,20}(guarantee|indicative)/i,
    /investment\s+risk/i,
    /not\s+investment\s+advice/i
  ],
  legal: [
    /not\s+(a\s+)?legal\s+advice/i,
    /consult\s+(an?\s+)?(attorney|lawyer|legal\s+professional)/i,
    /does\s+not\s+(create|establish)\s+(an?\s+)?attorney[-\s]client/i,
    /for\s+informational\s+purposes\s+only/i,
    /seek\s+(professional\s+)?legal\s+(advice|counsel)/i
  ],
  general: [
    /disclaimer/i,
    /we\s+(are|make)\s+no\s+(warranties|guarantees|representations)/i,
    /at\s+your\s+own\s+risk/i,
    /results\s+may\s+vary/i,
    /individual\s+results\s+(may\s+)?vary/i
  ]
};
export const DISCLAIMER_SELECTORS = [
  ".disclaimer",
  ".notice",
  ".warning",
  ".legal-notice",
  ".medical-disclaimer",
  ".financial-disclaimer",
  '[class*="disclaimer"]',
  '[class*="notice"]',
  '[id*="disclaimer"]',
  "small",
  ".fine-print"
];
export const disclaimersRule = defineRule({
  id: "eeat-disclaimers",
  name: "Disclaimers",
  description: "Checks for appropriate disclaimers on sensitive content",
  category: "eeat",
  weight: 4,
  run(context) {
    const { $ } = context;
    const ymylResult = detectYMYL($);
    const bodyText2 = bodyText($);
    let disclaimerAreaText = "";
    for (const selector of DISCLAIMER_SELECTORS) {
      $(selector).each((_, el) => {
        disclaimerAreaText += " " + $(el).text();
      });
    }
    const foundDisclaimers = [];
    const categoriesToCheck = ymylResult.isYMYL ? ymylResult.categories.map((c) => c.toLowerCase().replace(/[^a-z]/g, "")) : [];
    const categoryToPatternKey: Record<string, string> = {
      healthmedical: "medical",
      financial: "financial",
      legal: "legal"
    };
    for (const category of categoriesToCheck) {
      const patternKey = categoryToPatternKey[category];
      if (patternKey && DISCLAIMER_PATTERNS[patternKey]) {
        for (const pattern of DISCLAIMER_PATTERNS[patternKey]) {
          const textToCheck = disclaimerAreaText || bodyText2;
          const match = textToCheck.match(pattern);
          if (match) {
            foundDisclaimers.push({
              type: patternKey,
              text: match[0].slice(0, 100)
            });
            break;
          }
        }
      }
    }
    for (const pattern of DISCLAIMER_PATTERNS.general) {
      const match = (disclaimerAreaText || bodyText2).match(pattern);
      if (match) {
        foundDisclaimers.push({
          type: "general",
          text: match[0].slice(0, 100)
        });
        break;
      }
    }
    const hasDisclaimerSection = $(DISCLAIMER_SELECTORS.join(", ")).length > 0;
    if (!ymylResult.isYMYL) {
      if (foundDisclaimers.length > 0) {
        return {
          ruleId: "eeat-disclaimers",
          status: "pass",
          score: 100,
          message: `Disclaimer found (not required for non-YMYL content)`,
          details: {
            isYMYL: false,
            disclaimers: foundDisclaimers,
            hasDisclaimerSection
          }
        };
      }
      return {
        ruleId: "eeat-disclaimers",
        status: "pass",
        score: 100,
        message: "Non-YMYL content - disclaimers not required",
        details: {
          isYMYL: false,
          disclaimers: []
        }
      };
    }
    const requiredCategories = categoriesToCheck.filter((c) => categoryToPatternKey[c]);
    const foundCategories = foundDisclaimers.map((d) => d.type).filter((t) => t !== "general");
    if (foundDisclaimers.length > 0 && foundCategories.length >= requiredCategories.length) {
      return {
        ruleId: "eeat-disclaimers",
        status: "pass",
        score: 100,
        message: `Appropriate disclaimers found for YMYL content (${ymylResult.categories.join(", ")})`,
        details: {
          isYMYL: true,
          ymylCategories: ymylResult.categories,
          disclaimers: foundDisclaimers,
          hasDisclaimerSection
        }
      };
    }
    if (foundDisclaimers.length > 0) {
      return {
        ruleId: "eeat-disclaimers",
        status: "pass",
        score: 100,
        message: `Disclaimer found, but may need category-specific disclaimer for ${ymylResult.categories.join(", ")} content`,
        details: {
          isYMYL: true,
          ymylCategories: ymylResult.categories,
          disclaimers: foundDisclaimers,
          hasDisclaimerSection,
          recommendation: `Consider adding specific disclaimers for ${ymylResult.categories.join(", ")} content`
        }
      };
    }
    return {
      ruleId: "eeat-disclaimers",
      status: "warn",
      score: 50,
      message: `YMYL content (${ymylResult.categories.join(", ")}) without appropriate disclaimers`,
      details: {
        isYMYL: true,
        ymylCategories: ymylResult.categories,
        confidence: ymylResult.confidence,
        disclaimers: [],
        recommendation: getDisclaimerRecommendation(ymylResult.categories)
      }
    };
  }
});
export function getDisclaimerRecommendation(categories2: string[]) {
  const recommendations = [];
  for (const category of categories2) {
    const lower = category.toLowerCase();
    if (lower.includes("health") || lower.includes("medical")) {
      recommendations.push('Add medical disclaimer: "This content is for informational purposes only and is not a substitute for professional medical advice"');
    }
    if (lower.includes("financial")) {
      recommendations.push('Add financial disclaimer: "This is not financial advice. Consult a qualified financial advisor"');
    }
    if (lower.includes("legal")) {
      recommendations.push('Add legal disclaimer: "This is not legal advice. Consult a licensed attorney"');
    }
  }
  return recommendations.length > 0 ? recommendations.join(". ") : "Add appropriate disclaimers for sensitive content";
}
