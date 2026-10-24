
export function countSyllables(word: string) {
  word = word.toLowerCase().trim();
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;
  let processed = word;
  if (processed.endsWith("e") && !processed.endsWith("le")) {
    processed = processed.slice(0, -1);
  }
  if (word.endsWith("le") && word.length > 2) {
    const charBeforeLe = word[word.length - 3];
    if (!/[aeiouy]/.test(charBeforeLe)) {
      processed = word.slice(0, -2);
    }
  }
  if (word.endsWith("ed") && word.length > 3) {
    const charBeforeEd = word[word.length - 3];
    if (charBeforeEd !== "t" && charBeforeEd !== "d") {
      processed = word.slice(0, -2);
    }
  }
  const vowelGroups = processed.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  if (word.endsWith("le") && word.length > 2) {
    const charBeforeLe = word[word.length - 3];
    if (!/[aeiouy]/.test(charBeforeLe)) {
      count++;
    }
  }
  return Math.max(1, count);
}
export function calculateFleschKincaid(words3: string[], sentenceCount: number) {
  if (words3.length === 0 || sentenceCount === 0) return 0;
  const totalSyllables = words3.reduce(
    (sum, word) => sum + countSyllables(word),
    0
  );
  const avgSentenceLength = words3.length / sentenceCount;
  const avgSyllablesPerWord = totalSyllables / words3.length;
  const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  return Math.max(0, Math.min(100, score));
}
export function getReadingLevelDescription(score: number) {
  if (score >= 90) return "Very Easy (5th grade)";
  if (score >= 80) return "Easy (6th grade)";
  if (score >= 70) return "Fairly Easy (7th grade)";
  if (score >= 60) return "Standard (8th-9th grade)";
  if (score >= 50) return "Fairly Difficult (10th-12th grade)";
  if (score >= 30) return "Difficult (college level)";
  return "Very Difficult (college graduate)";
}
