import { defineRule, fail, pass } from "@/audit/engine/define-rule";
import { findItemsByType, hasField } from "@/audit/rules/schema/utils";

export const structuredDataFaqRule = defineRule({
  id: "schema-faq",
  name: "FAQ Schema",
  description: "Validates FAQPage schema for proper Question and Answer structure with required fields",
  category: "schema",
  weight: 8,
  run: async (context) => {
    const { $ } = context;
    const faqPages = findItemsByType($, "FAQPage");
    if (faqPages.length === 0) {
      return pass(
        "schema-faq",
        "No FAQPage schema found (not required)",
        { faqPagesFound: 0 }
      );
    }
    const issues = [];
    let totalQuestions = 0;
    for (const faqPage of faqPages) {
      if (!hasField(faqPage, "mainEntity")) {
        issues.push("FAQPage: missing mainEntity property");
        continue;
      }
      const mainEntity = faqPage.data.mainEntity;
      if (!Array.isArray(mainEntity)) {
        issues.push("FAQPage: mainEntity must be an array of Questions");
        continue;
      }
      if (mainEntity.length === 0) {
        issues.push("FAQPage: mainEntity array is empty");
        continue;
      }
      for (let i = 0; i < mainEntity.length; i++) {
        const question = mainEntity[i];
        const questionIndex = i + 1;
        if (question["@type"] !== "Question") {
          issues.push(
            `FAQPage Question #${questionIndex}: @type must be "Question", found "${question["@type"] || "missing"}"`
          );
          continue;
        }
        if (!question.name || typeof question.name !== "string" || question.name.trim() === "") {
          issues.push(
            `FAQPage Question #${questionIndex}: missing or empty "name" property (the question text)`
          );
        }
        if (!question.acceptedAnswer) {
          issues.push(
            `FAQPage Question #${questionIndex}: missing "acceptedAnswer" property`
          );
          continue;
        }
        const answer = question.acceptedAnswer;
        if (answer["@type"] !== "Answer") {
          issues.push(
            `FAQPage Question #${questionIndex}: acceptedAnswer @type must be "Answer", found "${answer["@type"] || "missing"}"`
          );
        }
        if (!answer.text || typeof answer.text !== "string" || answer.text.trim() === "") {
          issues.push(
            `FAQPage Question #${questionIndex}: acceptedAnswer missing or empty "text" property`
          );
        }
        totalQuestions++;
      }
    }
    if (issues.length > 0) {
      return fail(
        "schema-faq",
        `FAQPage schema validation failed: ${issues.join("; ")}`,
        {
          faqPagesFound: faqPages.length,
          issues
        }
      );
    }
    return pass(
      "schema-faq",
      `Valid FAQPage schema found with ${totalQuestions} question(s)`,
      {
        faqPagesFound: faqPages.length,
        questionsFound: totalQuestions
      }
    );
  }
});
