import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const STOP_WORDS = /* @__PURE__ */ new Set([
  // Articles
  "a",
  "an",
  "the",
  // Prepositions
  "about",
  "above",
  "after",
  "at",
  "before",
  "below",
  "between",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "to",
  "under",
  "with",
  "without",
  // Conjunctions
  "and",
  "but",
  "or",
  "nor",
  "so",
  "yet",
  // Pronouns
  "i",
  "me",
  "my",
  "you",
  "your",
  "he",
  "she",
  "it",
  "its",
  "we",
  "our",
  "they",
  "their",
  "this",
  "that",
  "these",
  "those",
  "which",
  "who",
  "whom",
  // Common verbs
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "can",
  "could",
  "will",
  "would",
  "should",
  // Other common words
  "just",
  "only",
  "also",
  "very",
  "really",
  "now",
  "then",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "any",
  "no",
  "not"
]);
export const KEEP_WORDS = /* @__PURE__ */ new Set([
  "how-to",
  "howto",
  "what-is",
  "whatis"
]);
export const STOP_WORD_RATIO_THRESHOLD = 0.4;
export function analyzeStopWords(url: string) {
  try {
    const urlObj = new URL(url);
    const path3 = urlObj.pathname;
    const segments = path3.split("/").filter((s) => s.length > 0);
    const words3 = [];
    for (const segment of segments) {
      const cleanSegment = segment.replace(/\.[^.]+$/, "");
      const segmentWords = cleanSegment.split(/[-_]/).flatMap((w) => w.split(/(?=[A-Z])/)).map((w) => w.toLowerCase()).filter((w) => w.length > 0);
      words3.push(...segmentWords);
    }
    if (words3.length === 0) {
      return {
        path: path3,
        words: [],
        stopWords: [],
        stopWordRatio: 0,
        suggestions: []
      };
    }
    const stopWords = words3.filter((word) => {
      for (const keep of KEEP_WORDS) {
        if (path3.toLowerCase().includes(keep)) {
          const keepWords = keep.split("-");
          if (keepWords.includes(word)) {
            return false;
          }
        }
      }
      return STOP_WORDS.has(word);
    });
    const stopWordRatio = words3.length > 0 ? stopWords.length / words3.length : 0;
    const suggestions = [];
    if (stopWords.length > 0) {
      const nonStopWords = words3.filter((w) => !STOP_WORDS.has(w));
      if (nonStopWords.length > 0) {
        suggestions.push(`Consider: /${nonStopWords.join("-")}`);
      }
    }
    return {
      path: path3,
      words: words3,
      stopWords: [...new Set(stopWords)],
      // Unique stop words
      stopWordRatio,
      suggestions
    };
  } catch {
    return {
      path: url,
      words: [],
      stopWords: [],
      stopWordRatio: 0,
      suggestions: []
    };
  }
}
export const stopWordsRule = defineRule({
  id: "url-stop-words",
  name: "URL Stop Words",
  description: "Flags common stop words (a, an, the, of, etc.) in URL slugs that add length without SEO value",
  category: "url",
  weight: 10,
  run: async (context) => {
    const { url } = context;
    const analysis = analyzeStopWords(url);
    const details = {
      url,
      path: analysis.path,
      words: analysis.words,
      stopWordsFound: analysis.stopWords,
      stopWordCount: analysis.stopWords.length,
      stopWordRatio: Math.round(analysis.stopWordRatio * 100),
      suggestions: analysis.suggestions
    };
    if (analysis.stopWords.length === 0) {
      return pass(
        "url-stop-words",
        "URL contains no stop words",
        details
      );
    }
    if (analysis.stopWordRatio <= STOP_WORD_RATIO_THRESHOLD) {
      return pass(
        "url-stop-words",
        `URL contains ${analysis.stopWords.length} stop word(s) but ratio is acceptable (${Math.round(analysis.stopWordRatio * 100)}%)`,
        details
      );
    }
    return warn(
      "url-stop-words",
      `URL contains ${analysis.stopWords.length} stop words (${analysis.stopWords.join(", ")}): ${Math.round(analysis.stopWordRatio * 100)}% of slug`,
      details
    );
  }
});
