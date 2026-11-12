/**
 * AI content-refresh detector. User points at a published URL + provides
 * a target keyword. We:
 *
 *   1. Pull the top 10 SERP results via the existing browser-mode SERP
 *      scanner.
 *   2. Fetch the user's page + each top-10 result.
 *   3. Diff term coverage: which TF-IDF-weighted terms appear in 5+ of
 *      the top results but NOT in the user's page.
 *   4. Diff sections: which H2/H3 headings appear in 3+ top results but
 *      not in the user's page.
 *   5. Send the gap to the LLM with a tight "what to add, in concrete
 *      bullets" prompt.
 *
 * Output: a refresh brief with missing topics, missing sections, and a
 * suggested update plan. No paid API.
 */

import { buildCorpus, type CorpusInsights } from "./content-grader";
import { callAI } from "./ai-call";
import { bodyWithout, fetchHtml, subHeadings, textOf } from "./fetch-html";

export type RefreshPlan = {
  url: string;
  targetKeyword: string;
  /** Word-count gap: user vs SERP median. Positive = user is shorter. */
  wordGap: number;
  /** Terms found in the SERP corpus but not in the user's page. */
  missingTerms: string[];
  /** SERP recurring headings the user doesn't have. */
  missingSections: string[];
  /** AI-written refresh brief (markdown bullets). */
  brief: string;
  /** Light stats. */
  userWordCount: number;
  serpMedianWordCount: number;
  corpusSize: number;
  error?: string;
};

export async function detectRefresh(opts: {
  url: string;
  targetKeyword: string;
  country?: string;
  clientId?: number;
}): Promise<RefreshPlan> {
  const country = opts.country ?? "US";

  // Pull SERP corpus + user page in parallel
  const [insights, userPage] = await Promise.all([
    buildCorpus({ targetKeyword: opts.targetKeyword, country }),
    fetchUserPage(opts.url),
  ]);

  if (insights.corpusSize === 0) {
    return emptyPlan(opts, insights.error ?? "Couldn't build SERP corpus");
  }
  if (!userPage) {
    return emptyPlan(opts, "Couldn't fetch the user's page");
  }

  const userTermSet = new Set(tokenize(userPage.text));
  const userHeadingSet = new Set(
    userPage.headings.map((h) => h.toLowerCase().trim()),
  );

  const missingTerms = insights.topTerms
    .filter((t) => !userTermSet.has(t.term))
    .slice(0, 25)
    .map((t) => t.term);
  const missingSections = insights.recurringHeadings
    .filter((h) => !userHeadingSet.has(h.heading.toLowerCase().trim()))
    .slice(0, 8)
    .map((h) => h.heading);

  const wordGap = insights.medianWordCount - userPage.wordCount;

  const brief = await aiBrief({
    url: opts.url,
    targetKeyword: opts.targetKeyword,
    insights,
    userPage,
    missingTerms,
    missingSections,
    wordGap,
    clientId: opts.clientId,
  });

  return {
    url: opts.url,
    targetKeyword: opts.targetKeyword,
    wordGap,
    missingTerms,
    missingSections,
    brief,
    userWordCount: userPage.wordCount,
    serpMedianWordCount: insights.medianWordCount,
    corpusSize: insights.corpusSize,
  };
}

const SYSTEM_PROMPT = `You are a senior content editor. The user's page exists but is being out-ranked. You see what the top 10 SERP results cover that the user doesn't. Produce a concrete refresh plan that, if executed, would close the gap.

Output a markdown bulleted list with these sections:
- **Add these sections** — H2/H3 headings to insert with one-sentence framing each
- **Cover these topics** — terms the page is missing, grouped if related
- **Length adjustment** — concrete word-count guidance
- **Recency check** — what dates / stats to update
- **Linking** — internal links worth adding given the new sections

Rules:
- Be specific. "Add a section called 'Pricing comparison'", not "Add more pricing info".
- Anchor every recommendation in the data given.
- ≤350 words total. Concise, scannable.
- No preamble, no closing summary. Bullets only.`;

async function aiBrief(opts: {
  url: string;
  targetKeyword: string;
  insights: CorpusInsights;
  userPage: { text: string; headings: string[]; wordCount: number };
  missingTerms: string[];
  missingSections: string[];
  wordGap: number;
  clientId?: number;
}): Promise<string> {
  const userPrompt = [
    `User's page: ${opts.url}`,
    `Target keyword: "${opts.targetKeyword}"`,
    `User's word count: ${opts.userPage.wordCount} · SERP median: ${opts.insights.medianWordCount} · gap: ${opts.wordGap > 0 ? "+" : ""}${opts.wordGap}`,
    "",
    `User's existing headings: ${opts.userPage.headings.slice(0, 12).join(" / ") || "(none detected)"}`,
    "",
    `Missing sections (used by 2+ top results, not on the user's page):`,
    ...opts.missingSections.map((h) => `  - ${h}`),
    "",
    `Missing terms (TF-IDF weighted, used widely in the SERP corpus):`,
    ...opts.missingTerms.slice(0, 15).map((t) => `  - ${t}`),
    "",
    "Write the refresh plan in markdown bullets now.",
  ].join("\n");

  const out = await callAI({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 800,
    temperature: 0.4,
    timeoutMs: 30_000,
    feature: "content_idea",
    clientId: opts.clientId ?? null,
  });
  return out ?? "";
}

async function fetchUserPage(
  url: string,
): Promise<{ text: string; headings: string[]; wordCount: number } | null> {
  const html = await fetchHtml(url);
  if (html === null) return null;
  const cleaned = bodyWithout(html, ["script", "style", "noscript", "nav", "footer"]);
  const text = textOf(cleaned);
  const tokens = text.split(/\s+/).filter(Boolean);
  return { text, headings: subHeadings(cleaned), wordCount: tokens.length };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\-\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w.length <= 28);
}

function emptyPlan(
  opts: { url: string; targetKeyword: string },
  error: string,
): RefreshPlan {
  return {
    url: opts.url,
    targetKeyword: opts.targetKeyword,
    wordGap: 0,
    missingTerms: [],
    missingSections: [],
    brief: "",
    userWordCount: 0,
    serpMedianWordCount: 0,
    corpusSize: 0,
    error,
  };
}
