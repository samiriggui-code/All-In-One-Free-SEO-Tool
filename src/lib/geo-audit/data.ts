import ai_crawlersJson from "./data/ai_crawlers.json";
import bot_challengesJson from "./data/bot_challenges.json";
import brand_platformsJson from "./data/brand_platforms.json";
import findingsJson from "./data/findings.json";
import metaJson from "./data/meta.json";
import retentionJson from "./data/retention.json";
import schema_requirementsJson from "./data/schema_requirements.json";
import site_kindsJson from "./data/site_kinds.json";
import thresholdsJson from "./data/thresholds.json";
import tiersJson from "./data/tiers.json";
import weightsJson from "./data/weights.json";

// Imported, not read from disk: a path built from import.meta.url points
// wherever the bundler put this module, which is not where the JSON is
// once the app is built (it only worked in Docker through a COPY that
// recreated src/lib/geo-audit/data beside the bundle).
const DATA: Record<string, unknown> = {
  ai_crawlers: ai_crawlersJson,
  bot_challenges: bot_challengesJson,
  brand_platforms: brand_platformsJson,
  findings: findingsJson,
  meta: metaJson,
  retention: retentionJson,
  schema_requirements: schema_requirementsJson,
  site_kinds: site_kindsJson,
  thresholds: thresholdsJson,
  tiers: tiersJson,
  weights: weightsJson,
};

export function load(name: string): Record<string, unknown> {
  const data = DATA[name];
  if (data === undefined) throw new Error(`Unknown GEO data file: ${name}`);
  return data as Record<string, unknown>;
}

export function dataVersion(): string {
  return (load("meta") as { data_version: string }).data_version;
}

export function tiers(): Array<{ label: string; min: number; meaning: string }> {
  return (load("tiers") as { tiers: Array<{ label: string; min: number; meaning: string }> })
    .tiers;
}

export function tierFor(score: number): { label: string; min: number; meaning: string } {
  for (const tier of tiers()) {
    if (score >= tier.min) return tier;
  }
  return tiers()[tiers().length - 1]!;
}

export function weights(): Record<
  string,
  { weight: number; signals: Record<string, { class: string; max: number }> }
> {
  return (load("weights") as {
    categories: Record<
      string,
      { weight: number; signals: Record<string, { class: string; max: number }> }
    >;
  }).categories;
}

export function thresholds(section: string): Record<string, unknown> {
  return (load("thresholds") as Record<string, Record<string, unknown>>)[section]!;
}

export function crawlers(): Array<{ token: string; critical: boolean }> {
  return (load("ai_crawlers") as { crawlers: Array<{ token: string; critical: boolean }> })
    .crawlers;
}

export function findingTemplate(kind: string, key: string): Record<string, unknown> {
  const findings = load("findings") as Record<string, Record<string, unknown>>;
  return findings[kind]![key] as Record<string, unknown>;
}
