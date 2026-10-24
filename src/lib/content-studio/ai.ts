import "server-only";
import { configuredProviders } from "@/lib/api-keys";
import { callAIResult, type AiFeatureName } from "@/lib/ai-call";
import type { AiFailure } from "@/lib/ai-error";
import type { JsonSchemaSpec } from "./json";
import { methodologyAsPrompt } from "./methodologies/loader";

/**
 * BlogPilot's AI layer, reduced to what the content studio needs.
 *
 * BlogPilot shipped its own provider registry, key store and failover.
 * This app already has all three (Settings → AI, ai-call.ts), so the
 * ported modules go through `callAIResult` instead: one set of keys,
 * one spend cap, one usage log. What stays from BlogPilot is the
 * prompt shape — methodologies in the system prompt, task + JSON input
 * in the user prompt — because the methodologies were written for it.
 */

/**
 * Stand-in for BlogPilot's provider chain.
 *
 * The ported modules all do `if (providers.length === 0) return fallback`
 * before calling the model, and keep a deterministic fallback for that
 * case. Returning a one-element marker when any key is configured keeps
 * that control flow untouched.
 */
export type ContentProvider = { readonly configured: true };

export async function contentProviders(): Promise<ContentProvider[]> {
  try {
    const { ids } = await configuredProviders();
    return ids.length > 0 ? [{ configured: true }] : [];
  } catch {
    return [];
  }
}

export interface ExecuteRequest {
  methodologies: string[];
  task: string;
  input: unknown;
  /** Kept so the ported call sites compile unchanged; routing is ai-call's job. */
  providers?: ContentProvider[];
  jsonMode?: boolean;
  /**
   * BlogPilot passed this to providers that support constrained decoding.
   * ai-call has no such option, so the schema goes into the prompt and
   * `parseJsonResponse` handles whatever comes back.
   */
  jsonSchema?: JsonSchemaSpec;
  temperature?: number;
  maxTokens?: number;
  feature?: AiFeatureName;
  clientId?: number | null;
}

export class ContentAiError extends Error {
  constructor(public readonly failure: AiFailure) {
    super(failure.message);
    this.name = "ContentAiError";
  }
}

export function buildPrompts(req: ExecuteRequest): { system: string; user: string } {
  const methodBlocks = req.methodologies.map((id) => methodologyAsPrompt(id)).join("\n---\n");
  const wantsJson = req.jsonMode || Boolean(req.jsonSchema);
  const system = [
    "You are the SEO content engine of an SEO tool's content studio.",
    "Follow the methodologies below EXACTLY. Do not deviate. Do not invent best practices.",
    "If a methodology says output JSON, output ONLY JSON (no prose, no markdown fences).",
    "",
    methodBlocks,
  ].join("\n");

  const schemaNote = req.jsonSchema
    ? `\n\nRespond with ONLY a JSON value matching this JSON Schema (${req.jsonSchema.name}):\n${JSON.stringify(req.jsonSchema.schema)}`
    : wantsJson
      ? "\n\nRespond with ONLY JSON."
      : "";

  const user = `Task: ${req.task}\n\nInput:\n${JSON.stringify(req.input, null, 2)}\n\nProduce the output specified by the methodologies above.${schemaNote}`;
  return { system, user };
}

/** Throws `ContentAiError` on failure — callers catch and fall back. */
export async function execute(req: ExecuteRequest): Promise<{ text: string }> {
  const { system, user } = buildPrompts(req);
  const r = await callAIResult({
    system,
    user,
    temperature: req.temperature ?? 0.5,
    maxTokens: req.maxTokens ?? 4096,
    // Articles, outlines and social sets are long by definition; the
    // terse credit-saver prompt would gut them.
    ignoreCreditSaver: true,
    timeoutMs: 120_000,
    feature: req.feature ?? "general",
    clientId: req.clientId ?? null,
  });
  if (!r.ok) throw new ContentAiError(r.failure);
  return { text: r.text };
}
