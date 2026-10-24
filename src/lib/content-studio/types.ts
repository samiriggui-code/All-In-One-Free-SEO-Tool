/**
 * Shapes the content studio stores in the database.
 *
 * Kept in a file with no runtime imports because src/db/schema.ts types
 * its JSON columns with them, and the tool-capabilities generator walks
 * imports: pointing the schema at writer.ts would mark every page that
 * touches the database as needing AI.
 */
import type { IntentResult } from "./seo/intent";

export interface StyleProfile {
  tone?: string;
  voice?: string;
  avgSentenceLength?: number;
  headingCase?: "title" | "sentence";
  ctaStyle?: string;
  language?: string;
}

export interface OutlineH2 {
  heading: string;
  h3s: string[];
  notes?: string;
  snippet_target?: boolean;
}

export interface OutlineFaq { q: string; a_target_words?: number; }

export interface Outline {
  title: string;
  slug: string;
  tldr_bullets: string[];
  intro_hook: string;
  h2s: OutlineH2[];
  faqs: OutlineFaq[];
  conclusion_cta: string;
  internal_link_topics: string[];
  image_suggestions: Array<{ placement: string; alt: string }>;
  word_count_target: number;
}

export interface SocialPack {
  x_thread: string[];
  linkedin: string;
  instagram: string;
  pinterest: string;
  whatsapp: string;
}

export interface NewsletterPack {
  short: string;
  long: string;
}

export interface KeywordSuggestion {
  keyword: string;
  source: "autocomplete" | "paa" | "seed";
  intent: IntentResult;
}

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
}
