import "server-only";
import { gatherCorpus, type CorpusContext } from "./seo/content-score";

/**
 * The top-10 corpus a draft is scored against, kept in memory.
 *
 * Fetching it means one SERP request and up to ten page downloads,
 * 10-30 seconds. Scoring against it is pure and takes milliseconds. The
 * editor rescores every time the writer pauses, so the corpus is fetched
 * once per keyword and reused; an hour is long enough for a writing
 * session and short enough that a changed SERP is picked up the next day.
 *
 * Process memory rather than the database: it is a cache of public
 * pages, losing it on restart costs one refetch, and the bodies are too
 * large to be worth a table.
 */
const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 30;

type Entry = { at: number; ctx: CorpusContext };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<CorpusContext>>();

const keyOf = (keyword: string, lang: string) => `${lang}:${keyword.trim().toLowerCase()}`;

export function cachedCorpus(keyword: string, lang: string): CorpusContext | null {
  const hit = cache.get(keyOf(keyword, lang));
  if (!hit || Date.now() - hit.at > TTL_MS) return null;
  return hit.ctx;
}

export async function loadCorpus(keyword: string, lang: string, refresh = false): Promise<CorpusContext> {
  const key = keyOf(keyword, lang);
  if (!refresh) {
    const hit = cachedCorpus(keyword, lang);
    if (hit) return hit;
  }
  const running = inflight.get(key);
  if (running) return running;

  const job = gatherCorpus(keyword, lang)
    .then(({ pages, paaQuestions }) => {
      const ctx: CorpusContext = { pages, paaQuestions };
      // A blocked or failed SERP fetch is not worth remembering: the next
      // "analyse" click should try again rather than replay the failure.
      if (!pages.some((p) => p.fetched)) return ctx;
      cache.delete(key);
      cache.set(key, { at: Date.now(), ctx });
      // Map keeps insertion order, so the first key is the oldest.
      while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
      return ctx;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}
