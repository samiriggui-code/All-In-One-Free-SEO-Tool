// Topic Authority Scorer — uses Wikipedia's public API as the entity ground truth.
// No API key required.
import { REPO_UA_SUFFIX } from "@/lib/repo";

interface WikiSearchResp {
  query?: {
    search?: Array<{ title: string }>;
  };
}

interface WikiParseResp {
  parse?: {
    title: string;
    sections?: Array<{ line: string; level: string }>;
    links?: Array<{ "*": string; ns: number }>;
  };
}

export interface TopicAuthorityCoveredEntity {
  entity: string;
  post_count: number;
}

export interface TopicAuthorityMissingEntity {
  entity: string;
  suggested_post_title: string;
}

export interface TopicAuthorityResult {
  niche: string;
  score: number;
  tier: "strong" | "moderate" | "surface" | "no_data";
  wikipedia_anchor: string | null;
  total_entities: number;
  covered: TopicAuthorityCoveredEntity[];
  missing: TopicAuthorityMissingEntity[];
  recommended_action: string;
}

/** "fr-FR" → "fr". Anything odd falls back to English Wikipedia. */
function wikiHost(lang: string): string {
  const code = lang.toLowerCase().split(/[-_]/)[0];
  return `${/^[a-z]{2,3}$/.test(code) ? code : "en"}.wikipedia.org`;
}

async function wikiSearch(query: string, host: string): Promise<string | null> {
  const url = `https://${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`;
  try {
    const r = await fetch(url, { headers: { "user-agent": `SEOToolContentStudio/1.0 (${REPO_UA_SUFFIX})` } });
    if (!r.ok) return null;
    const j = (await r.json()) as WikiSearchResp;
    return j.query?.search?.[0]?.title ?? null;
  } catch {
    return null;
  }
}

async function wikiParse(title: string, host: string): Promise<WikiParseResp["parse"] | null> {
  const url = `https://${host}/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=sections|links&format=json&origin=*`;
  try {
    const r = await fetch(url, { headers: { "user-agent": `SEOToolContentStudio/1.0 (${REPO_UA_SUFFIX})` } });
    if (!r.ok) return null;
    const j = (await r.json()) as WikiParseResp;
    return j.parse ?? null;
  } catch {
    return null;
  }
}

function tier(score: number): TopicAuthorityResult["tier"] {
  if (score >= 70) return "strong";
  if (score >= 40) return "moderate";
  return "surface";
}

export async function scoreTopicAuthority(
  niche: string,
  clientPostsText: string,
  lang = "en"
): Promise<TopicAuthorityResult> {
  const host = wikiHost(lang);
  const article = await wikiSearch(niche, host);
  if (!article) {
    return {
      niche,
      score: 0,
      tier: "no_data",
      wikipedia_anchor: null,
      total_entities: 0,
      covered: [],
      missing: [],
      recommended_action: "No Wikipedia anchor found for this niche. Try a broader seed term."
    };
  }
  const parsed = await wikiParse(article, host);
  if (!parsed) {
    return {
      niche,
      score: 0,
      tier: "no_data",
      wikipedia_anchor: `https://${host}/wiki/${encodeURIComponent(article)}`,
      total_entities: 0,
      covered: [],
      missing: [],
      recommended_action: "Could not parse Wikipedia article."
    };
  }

  const sections = (parsed.sections ?? [])
    .filter((s) => s.level === "2" || s.level === "3")
    .map((s) => s.line.trim())
    .filter((s) => s && !/^(see also|references|external links|bibliography|further reading|notes|voir aussi|références|liens externes|bibliographie|articles connexes|notes et références)$/i.test(s));

  const links = (parsed.links ?? [])
    .filter((l) => l.ns === 0)
    .map((l) => l["*"].trim())
    .filter(
      (t) =>
        t.length > 2 &&
        t.length < 60 &&
        !/^\d/.test(t) &&
        !/^[A-Z]{2,}$/.test(t)
    );

  // Merge + dedupe + cap
  const entityMap = new Map<string, string>();
  for (const s of sections) entityMap.set(s.toLowerCase(), s);
  for (const l of links) {
    if (!entityMap.has(l.toLowerCase())) entityMap.set(l.toLowerCase(), l);
  }
  const entities = [...entityMap.values()].slice(0, 30);

  // Match against client posts
  const haystack = clientPostsText.toLowerCase();
  const covered: TopicAuthorityCoveredEntity[] = [];
  const missing: TopicAuthorityMissingEntity[] = [];

  for (const entity of entities) {
    const e = entity.toLowerCase();
    // Letter-aware boundaries: \b treats "é" as a word break, so French
    // entities like "énergie" would never match.
    const escaped = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = haystack.match(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu"));
    if (matches && matches.length > 0) {
      covered.push({ entity, post_count: matches.length });
    } else {
      missing.push({
        entity,
        suggested_post_title: `${entity.charAt(0).toUpperCase() + entity.slice(1)} for ${niche}`
      });
    }
  }

  const score = entities.length > 0 ? Math.round((covered.length / entities.length) * 100) : 0;
  const t = tier(score);

  return {
    niche,
    score,
    tier: t,
    wikipedia_anchor: `https://${host}/wiki/${encodeURIComponent(article)}`,
    total_entities: entities.length,
    covered: covered.sort((a, b) => b.post_count - a.post_count),
    missing: missing.slice(0, 20),
    recommended_action:
      t === "strong"
        ? "Maintain depth. Look for differentiator topics outside the canonical entity set."
        : t === "moderate"
          ? `Write ${Math.min(missing.length, 8)} posts covering the missing entities to reach Strong tier.`
          : `Surface-level coverage. Focus the next 10-15 posts on missing entities before competing for head terms.`
  };
}
