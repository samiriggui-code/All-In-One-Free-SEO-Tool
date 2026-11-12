/**
 * What an AI call is for, and which model serves it.
 *
 * One workspace model fits nobody: a chat wants a quick, cheap model, a
 * 2 000-word article wants a strong one, an overnight batch wants the
 * cheapest that works. Settings → AI → "Defaults by use" stores one
 * provider + model per purpose under `ai.model.<purpose>`; a purpose left
 * empty uses the workspace model as before.
 *
 * `embeddings` is stored here so the choice lives with the others; the
 * knowledge base (IA-2) reads it.
 */

import type { ActiveProvider } from "./api-keys";
import { isModelForProvider, MODEL_PRESETS } from "./ai-model-presets";

export const AI_PURPOSES = ["chat", "writing", "background", "vision", "embeddings"] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];

/** Where a call came from, recorded on every row of ai_calls. */
export type AiChannel = "app" | "assistant" | "background" | "portal";

export type PurposeModel = { provider: ActiveProvider; model: string };

export function purposeSettingKey(purpose: AiPurpose): `ai.model.${AiPurpose}` {
  return `ai.model.${purpose}`;
}

/** Long-form features that should default to the "writing" model. */
const WRITING_FEATURES = new Set(["blog_draft"]);

/** The purpose a call has when it did not say: from its feature, else none. */
export function purposeFor(opts: { purpose?: AiPurpose; feature?: string }): AiPurpose | null {
  if (opts.purpose) return opts.purpose;
  if (opts.feature && WRITING_FEATURES.has(opts.feature)) return "writing";
  return null;
}

export function channelFor(opts: { channel?: AiChannel; purpose?: AiPurpose | null }): AiChannel {
  if (opts.channel) return opts.channel;
  if (opts.purpose === "chat") return "assistant";
  if (opts.purpose === "background") return "background";
  return "app";
}

/**
 * Embedding models are not chat models, so they are not in MODEL_PRESETS.
 * Anthropic has none; these are the providers the knowledge base can use.
 */
export type EmbeddingPreset = { id: string; label: string; /** USD per 1M input tokens, null = free. */ inputPer1M: number | null };

export const EMBEDDING_PRESETS: Partial<Record<ActiveProvider, EmbeddingPreset[]>> = {
  openai: [
    { id: "text-embedding-3-small", label: "text-embedding-3-small", inputPer1M: 0.02 },
    { id: "text-embedding-3-large", label: "text-embedding-3-large", inputPer1M: 0.13 },
  ],
  gemini: [{ id: "text-embedding-004", label: "text-embedding-004", inputPer1M: null }],
  mistral: [{ id: "mistral-embed", label: "mistral-embed", inputPer1M: 0.1 }],
  ollama: [{ id: "nomic-embed-text", label: "nomic-embed-text", inputPer1M: null }],
};

export function embeddingPreset(model: string | null | undefined): EmbeddingPreset | undefined {
  if (!model) return undefined;
  for (const list of Object.values(EMBEDDING_PRESETS)) {
    const hit = list?.find((m) => m.id === model);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Validate a stored choice. A model is accepted when it is one of the
 * provider's presets (embedding presets for `embeddings`), or (OpenRouter
 * and Ollama, whose catalogues are open-ended) any non-empty id without
 * spaces.
 */
export function normalizePurposeModel(raw: unknown, purpose?: AiPurpose): PurposeModel | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PurposeModel>;
  const provider = String(r.provider ?? "") as ActiveProvider;
  const model = String(r.model ?? "").trim();
  if (!provider || !(provider in MODEL_PRESETS)) return null;
  if (purpose === "embeddings") {
    const list = EMBEDDING_PRESETS[provider];
    if (!list) return null;
    if (!model) return { provider, model: list[0].id };
    if (list.some((m) => m.id === model)) return { provider, model };
    return provider === "ollama" && /^[\w.:/@-]{1,120}$/.test(model) ? { provider, model } : null;
  }
  if (!model) return { provider, model: "" };
  if (isModelForProvider(provider, model)) return { provider, model };
  if ((provider === "openrouter" || provider === "ollama") && /^[\w.:/@-]{1,120}$/.test(model)) {
    return { provider, model };
  }
  return null;
}
