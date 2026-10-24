import { bodyText } from "@/audit/rules/content/utils/visible-text";
import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const PLACEHOLDER_PATTERNS = [
  /lorem\s+ipsum/i,
  /dolor\s+sit\s+amet/i,
  /consectetur\s+adipiscing/i
];
export const loremIpsumRule = defineRule({
  id: "htmlval-lorem-ipsum",
  name: "No Placeholder Text",
  description: "Checks for lorem ipsum and other placeholder text in the page content",
  category: "htmlval",
  weight: 5,
  run: async (context) => {
    const { $ } = context;
    const bodyText2 = bodyText($);
    const matched = [];
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(bodyText2)) {
        const match = bodyText2.match(pattern);
        if (match) {
          matched.push(match[0]);
        }
      }
    }
    if (matched.length > 0) {
      return fail(
        "htmlval-lorem-ipsum",
        `Placeholder/dummy text detected: "${matched[0]}". Remove all placeholder text before publishing`,
        { matchedPhrases: matched, count: matched.length }
      );
    }
    return pass(
      "htmlval-lorem-ipsum",
      "No placeholder text detected"
    );
  }
});
