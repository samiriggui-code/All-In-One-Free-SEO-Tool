import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { extractMainContent, getWordFrequency, stripUrls, tokenize } from "@/audit/rules/content/utils/text-extractor";
import { getKeywordWords } from "@/audit/rules/content/utils/stopwords";

export const WARN_DENSITY = 4;
export const SEVERE_DENSITY = 10;
export const TOPIC_DENSITY_ALLOWANCE = 8;
export const MIN_OCCURRENCES = 5;
export const MIN_CONTENT_WORDS = 200;
export const WARN_COUNT = 3;
export const MIN_WORD_LENGTH = 3;
export const keywordStuffingRule = defineRule({
  id: "content-keyword-stuffing",
  name: "Keyword Stuffing",
  description: "Detects excessive keyword repetition in content",
  category: "content",
  weight: 5,
  run: async (context) => {
    const { $ } = context;
    const mainContent = stripUrls(extractMainContent($));
    const allWords = tokenize(mainContent);
    const contentWords = getKeywordWords(allWords, MIN_WORD_LENGTH);
    if (contentWords.length < MIN_CONTENT_WORDS) {
      return pass(
        "content-keyword-stuffing",
        `Content too short for keyword analysis (${contentWords.length} content words)`,
        {
          totalWords: allWords.length,
          contentWords: contentWords.length,
          skipped: true,
          reason: `Minimum ${MIN_CONTENT_WORDS} content words required. Below this, keyword density is dominated by sample size rather than by word choice.`
        }
      );
    }
    const frequency = getWordFrequency(contentWords);
    let topicTerm = "";
    let topicCount = 0;
    for (const [word, count] of frequency.entries()) {
      if (count > topicCount) {
        topicTerm = word;
        topicCount = count;
      }
    }
    const overusedWords = [];
    const severelyOverusedWords = [];
    for (const [word, count] of frequency.entries()) {
      if (count < MIN_OCCURRENCES) continue;
      const density = parseFloat((count / contentWords.length * 100).toFixed(2));
      const threshold = word === topicTerm ? TOPIC_DENSITY_ALLOWANCE : WARN_DENSITY;
      if (density >= SEVERE_DENSITY) {
        severelyOverusedWords.push({ word, count, density });
      } else if (density >= threshold) {
        overusedWords.push({ word, count, density });
      }
    }
    overusedWords.sort((a, b) => b.density - a.density);
    severelyOverusedWords.sort((a, b) => b.density - a.density);
    const details = {
      totalWords: allWords.length,
      contentWords: contentWords.length,
      topicTerm,
      topicTermCount: topicCount,
      thresholds: {
        warnDensity: WARN_DENSITY,
        severeDensity: SEVERE_DENSITY,
        topicTermAllowance: TOPIC_DENSITY_ALLOWANCE,
        minOccurrences: MIN_OCCURRENCES
      },
      overusedWords: overusedWords.slice(0, 10),
      severelyOverusedWords,
      note: `"${topicTerm}" is treated as this page's primary topic and allowed up to ${TOPIC_DENSITY_ALLOWANCE}% density before being flagged.`
    };
    if (severelyOverusedWords.length > 0) {
      const worst = severelyOverusedWords[0];
      return warn(
        "content-keyword-stuffing",
        `Very high keyword density: "${worst.word}" appears ${worst.count} times (${worst.density}%)`,
        {
          ...details,
          topOffenders: severelyOverusedWords.slice(0, 3),
          impact: `Density above ${SEVERE_DENSITY}% is high enough that the repetition is likely noticeable to readers. Verify it reads naturally before acting.`,
          recommendation: "Read the affected passages aloud. If the repetition sounds forced, vary the wording with synonyms and related terms. If it reads naturally, no change is needed."
        }
      );
    }
    if (overusedWords.length >= WARN_COUNT) {
      return warn(
        "content-keyword-stuffing",
        `${overusedWords.length} terms exceed ${WARN_DENSITY}% density`,
        {
          ...details,
          topOffenders: overusedWords.slice(0, 3),
          impact: "Several terms repeat more than usual. This is often legitimate for a focused page, so treat it as a prompt to review rather than a defect.",
          recommendation: "Check whether the flagged terms read naturally in context. Vary the wording only where the repetition feels mechanical."
        }
      );
    }
    return pass("content-keyword-stuffing", "No keyword stuffing detected", {
      ...details,
      note: `Keyword density is within acceptable limits. ${details.note}`
    });
  }
});
