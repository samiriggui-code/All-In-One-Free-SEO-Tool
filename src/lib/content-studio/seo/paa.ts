// "People also ask"-style question discovery.
//
// This used to scrape Bing's PAA module. That no longer works: Bing does not
// ship a PAA block in the HTML it serves to a plain fetch, and it is absent
// even from a fully rendered page — the old `.df_qntext` / `.b_secondaryFocus`
// selectors match zero nodes, so the function silently returned [] forever.
//
// Google's autocomplete endpoint is public, fast, and still works, so we derive
// the question set from it by expanding interrogative prefixes. The results are
// real user queries, which is what PAA is built from in the first place.

import { googleAutocomplete } from "./autocomplete";

const QUESTION_PREFIXES = [
  "how",
  "what",
  "why",
  "when",
  "is",
  "can",
  "does",
  "should",
  "which",
  "where"
];

const QUESTION_START =
  /^(how|what|why|when|where|which|who|whose|is|are|was|were|can|could|does|do|did|should|will|would|has|have)\b/i;

function toQuestion(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const cased = t.charAt(0).toUpperCase() + t.slice(1);
  return cased.endsWith("?") ? cased : `${cased}?`;
}

/**
 * Return up to `limit` question-shaped queries related to `query`.
 * Never throws — returns [] when the upstream endpoint is unreachable.
 */
export async function peopleAlsoAsk(query: string, limit = 8, lang = "en"): Promise<string[]> {
  const seed = query.replace(/\?+$/, "").trim();
  if (!seed) return [];

  const found = new Set<string>();

  // Seed query first: it often already returns question-shaped suggestions.
  const probes = [seed, ...QUESTION_PREFIXES.map((p) => `${p} ${seed}`)];

  for (const probe of probes) {
    if (found.size >= limit) break;
    let suggestions: string[] = [];
    try {
      suggestions = (await googleAutocomplete(probe, lang)).suggestions;
    } catch {
      continue;
    }
    for (const s of suggestions) {
      if (!QUESTION_START.test(s)) continue;
      if (s.trim().toLowerCase() === seed.toLowerCase()) continue;
      const q = toQuestion(s);
      if (q.length > 8 && q.length < 200) found.add(q);
      if (found.size >= limit) break;
    }
  }

  return [...found].slice(0, limit);
}
