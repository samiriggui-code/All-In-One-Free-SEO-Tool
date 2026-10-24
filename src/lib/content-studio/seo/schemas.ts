// JSON Schemas for every AI generation that must return structured data.
//
// Providers that support schema-constrained decoding (OpenAI, Gemini, Anthropic,
// newer Ollama) enforce these, which removes the whole class of "the model wrote
// prose around the JSON" failures. Providers that ignore the schema still get
// plain JSON mode, and every call site keeps its deterministic fallback — so a
// schema is an upgrade, never a new hard dependency.

import { objectSchema, type JsonSchemaSpec } from "../json";

const str = { type: "string" } as const;
const strArray = { type: "array", items: { type: "string" } } as const;

export const metaSchema: JsonSchemaSpec = objectSchema(
  "meta_tags",
  {
    metaTitle: { ...str, description: "<= 60 characters" },
    metaDescription: { ...str, description: "120-160 characters" },
    warnings: strArray
  },
  ["metaTitle", "metaDescription", "warnings"]
);

export const socialSchema: JsonSchemaSpec = objectSchema(
  "social_pack",
  {
    x_thread: { ...strArray, description: "One string per post in the thread" },
    linkedin: str,
    instagram: str,
    pinterest: str,
    whatsapp: str
  },
  ["x_thread", "linkedin", "instagram", "pinterest", "whatsapp"]
);

export const newsletterSchema: JsonSchemaSpec = objectSchema(
  "newsletter_pack",
  {
    short: { ...str, description: "<= 240 characters" },
    long: { ...str, description: "Multi-paragraph plain-text excerpt" }
  },
  ["short", "long"]
);

export const imageBriefSchema: JsonSchemaSpec = objectSchema(
  "image_brief",
  {
    images: {
      type: "array",
      items: {
        type: "object",
        properties: {
          placement: str,
          alt_text: str,
          caption: str,
          filename_suggestion: str,
          width_height_ratio: str,
          format: str,
          ai_prompt: str,
          stock_search_terms: strArray,
          on_page_role: str
        },
        required: [
          "placement",
          "alt_text",
          "filename_suggestion",
          "width_height_ratio",
          "format",
          "ai_prompt",
          "stock_search_terms",
          "on_page_role"
        ],
        additionalProperties: false
      }
    }
  },
  ["images"]
);

export const gapAnalysisSchema: JsonSchemaSpec = objectSchema(
  "gap_analysis",
  {
    gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: str,
          competitor_count: { type: "integer" },
          status: { type: "string", enum: ["missing", "weak"] },
          priority: { type: "integer" },
          suggested_post_title: str,
          rationale: str
        },
        required: [
          "topic",
          "competitor_count",
          "status",
          "priority",
          "suggested_post_title",
          "rationale"
        ],
        additionalProperties: false
      }
    },
    table_stakes: strArray,
    differentiators: strArray
  },
  ["gaps", "table_stakes", "differentiators"]
);

export const refreshSchema: JsonSchemaSpec = objectSchema(
  "refreshed_post",
  {
    refreshed_markdown: str,
    meta_title: str,
    meta_description: str,
    change_log: {
      type: "array",
      items: {
        type: "object",
        properties: { type: str, detail: str },
        required: ["type", "detail"],
        additionalProperties: false
      }
    }
  },
  ["refreshed_markdown", "meta_title", "meta_description", "change_log"]
);

export const brandVoiceSchema: JsonSchemaSpec = objectSchema(
  "brand_voice_profile",
  {
    tone: str,
    voice: str,
    avgSentenceLength: { type: "integer" },
    headingCase: { type: "string", enum: ["title", "sentence"] },
    ctaStyle: str,
    vocabularyLevel: str,
    hedgeWords: str,
    contractions: { type: "boolean" },
    emDashes: str,
    listsVsProse: str,
    authorPersona: str,
    phrasesToKeep: strArray,
    phrasesToAvoid: strArray
  },
  ["tone", "voice", "headingCase", "authorPersona"]
);

export const outlineSchema: JsonSchemaSpec = objectSchema(
  "post_outline",
  {
    title: str,
    slug: str,
    tldr_bullets: strArray,
    intro_hook: str,
    h2s: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: str,
          h3s: strArray,
          notes: str,
          snippet_target: { type: "boolean" }
        },
        required: ["heading", "h3s"],
        additionalProperties: false
      }
    },
    faqs: {
      type: "array",
      items: {
        type: "object",
        properties: { q: str, a_target_words: { type: "integer" } },
        required: ["q"],
        additionalProperties: false
      }
    },
    conclusion_cta: str,
    internal_link_topics: strArray,
    image_suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: { placement: str, alt: str },
        required: ["placement", "alt"],
        additionalProperties: false
      }
    },
    word_count_target: { type: "integer" }
  },
  ["title", "slug", "tldr_bullets", "intro_hook", "h2s", "faqs", "conclusion_cta", "word_count_target"]
);

// Wrapped in an object because several providers reject a top-level array root.
export const calendarSchema: JsonSchemaSpec = objectSchema(
  "content_calendar",
  {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: str,
          slug: str,
          primary_keyword: str,
          intent: str,
          format: str,
          cluster: str,
          is_pillar: { type: "boolean" },
          word_count_target: { type: "integer" },
          priority: { type: "integer" },
          rationale: str
        },
        required: [
          "title",
          "slug",
          "primary_keyword",
          "intent",
          "format",
          "cluster",
          "is_pillar",
          "word_count_target",
          "priority",
          "rationale"
        ],
        additionalProperties: false
      }
    }
  },
  ["items"]
);
