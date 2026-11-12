import { cache } from "react";
import { getActiveProvider, getApiKey, getOllamaUrl } from "./api-keys";
import { getSetting } from "./settings-store";
import { checkMonthlyCap, logAiCall } from "./ai-usage";

// Cap how much of the user/system prompt we persist to ai_usage_log.
// Full prompts may contain pasted API keys, OAuth tokens, or other
// secrets — and the ai_usage_log table is NOT encrypted at rest.
// A short preview is enough for debugging without becoming a credential
// leak vector if data.db is ever backed up to an untrusted location.
const LOG_PROMPT_PREVIEW_CHARS = 300;
function logPreview(text: string): string {
  if (typeof text !== "string") return "";
  if (text.length <= LOG_PROMPT_PREVIEW_CHARS) return text;
  return text.slice(0, LOG_PROMPT_PREVIEW_CHARS) + "... (truncated)";
}
import { withAiPermit } from "./ai-semaphore";
import { dispatchProviderCall, defaultModelFor } from "./provider-dispatch";
import { isModelForProvider } from "./ai-model-presets";
import { estimateTokens } from "./ai-cost";
import {
  AI_PURPOSES,
  channelFor,
  normalizePurposeModel,
  purposeFor,
  purposeSettingKey,
  type AiChannel,
  type AiPurpose,
} from "./ai-purpose";
import { guardText, normalizeGuardrails, summarize, type GuardrailSettings } from "./guardrails";
import {
  classifyProviderError,
  emptyResponseFailure,
  guardrailFailure,
  monthlyCapFailure,
  noProviderFailure,
  type AiFailure,
  type AiResult,
} from "./ai-error";

export type AiFeatureName =
  | "exec_summary"
  | "blog_draft"
  | "title_rewrite"
  | "meta_rewrite"
  | "review_reply"
  | "content_idea"
  | "ai_sentiment"
  | "geo_swot"
  | "assistant"
  | "import_extract"
  | "general";

export type AiCallOptions = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Per-call timeout in ms. Defaults to 60s — blog writing can be slow. */
  timeoutMs?: number;
  /**
   * Bypass credit-saver mode. Use only for features where terse output is
   * useless (e.g. full blog drafts that need to be long by definition).
   */
  ignoreCreditSaver?: boolean;
  /**
   * Tags this call so the feedback-learning module can inject learned
   * style rules into the system prompt. Optional but recommended for
   * any user-facing feature that takes corrections.
   */
  feature?: AiFeatureName;
  /** Scopes learned rules to this client when set. */
  clientId?: number | null;
  /**
   * Per-call provider override. When set, the call uses this provider instead
   * of the workspace's active provider. The user must still have a key
   * configured for the override; otherwise we fall back to the active provider
   * (or null if nothing's configured at all).
   */
  providerOverride?: import("./api-keys").ActiveProvider;
  /** Per-call model override paired with providerOverride (or active). */
  modelOverride?: string;
  /**
   * What the call is for. Picks the model chosen for that use in
   * Settings → AI → Defaults by use (see ai-purpose.ts). A call that
   * says nothing is read from its `feature`, else uses the workspace model.
   */
  purpose?: AiPurpose;
  /** Where the call came from, for Settings → AI usage. Derived when absent. */
  channel?: AiChannel;
  /**
   * A whole conversation, oldest first, ending with the user's turn. When
   * set, it is sent instead of `user` (which is then only used for the
   * log preview).
   */
  messages?: { role: "user" | "assistant"; content: string }[];
};

export { AI_PURPOSES };

async function providerUsable(p: import("./api-keys").ActiveProvider): Promise<boolean> {
  if (p === "ollama") return Boolean(await getOllamaUrl());
  return Boolean(await getApiKey(p));
}

async function loadGuardrails(): Promise<GuardrailSettings> {
  try {
    return normalizeGuardrails({
      mode: await getSetting<string>("guardrails.mode"),
      blockedTerms: await getSetting<string[]>("guardrails.blocked_terms"),
    });
  } catch {
    return normalizeGuardrails(null);
  }
}

function recordIncident(row: {
  direction: "in" | "out";
  action: "mask" | "block";
  kinds: Record<string, number>;
  feature: string;
  channel: AiChannel;
  clientId: number | null;
}): void {
  void (async () => {
    try {
      const [{ db }, { guardrailIncidents }] = await Promise.all([
        import("@/db/client"),
        import("@/db/schema"),
      ]);
      await db.insert(guardrailIncidents).values(row);
    } catch {
      // The journal must never break the call it describes.
    }
  })();
}

/**
 * Calls whichever AI provider the user has set as active. Returns the text
 * response, or null on any failure (no key, network, parsing, etc.).
 *
 * One implementation here means every feature (exec summaries, blog writing,
 * future agents) gets the same provider routing for free.
 *
 * Credit-saver mode (toggled in Settings → AI):
 *   - prepends "Be terse — 2-4 sentences" to the system prompt
 *   - caps maxTokens at 500
 *   - lowers temperature for deterministic answers (cheaper rerolls)
 *   - features that need length (blog writer) opt out via ignoreCreditSaver
 */
/**
 * Back-compat shim. Returns the text, or null on any failure.
 *
 * Prefer `callAIResult` for anything user-facing: this signature is
 * exactly the problem the audit found — every failure mode (no key,
 * retired model, spend cap, timeout, provider 500) collapsed into the
 * same `null`, and all 68 call sites rendered the same empty box.
 */
export async function callAI(opts: AiCallOptions): Promise<string | null> {
  const r = await callAIResult(opts);
  if (!r.ok) recordAiFailure(r.failure);
  return r.ok ? r.text : null;
}

/**
 * Per-request holder for the last AI failure.
 *
 * There are 65 `await callAI(...)` sites, almost all shaped like:
 *
 *     const text = await callAI({ ... });
 *     if (text) { ...use it... }
 *
 * When it's null they skip silently — no error, no message, nothing to
 * tell the user an AI step was even attempted. Rewriting all 65 to
 * `callAIResult` and threading a failure object through each return type
 * is the thorough fix and a very large diff across 52 files.
 *
 * This is the small one. `callAI` records why it failed, and any action
 * can surface it by adding a single field to what it already returns:
 *
 *     return { ok: true, rows, aiFailure: lastAiFailure() };
 *
 * `cache()` scopes the holder to one request, so two users hitting
 * different tools at the same time can't see each other's failure — the
 * bug a module-level variable would have introduced.
 */
const failureHolder = cache((): { current: AiFailure | null } => ({
  current: null,
}));

function recordAiFailure(failure: AiFailure): void {
  try {
    failureHolder().current = failure;
  } catch {
    // Outside a request scope (scheduler, scripts). Nothing to show a
    // user there, and this must never break the caller.
  }
}

/**
 * Why the most recent `callAI` in this request failed, or null.
 *
 * Returns null when the call succeeded, so `aiFailure: lastAiFailure()`
 * is safe to add unconditionally.
 */
export function lastAiFailure(): AiFailure | null {
  try {
    return failureHolder().current;
  } catch {
    return null;
  }
}

/**
 * The real entry point. Always resolves; on failure carries a reason
 * code plus a sentence naming the fix and a link to the setting.
 */
export async function callAIResult(opts: AiCallOptions): Promise<AiResult> {
  const purpose = purposeFor(opts);
  const channel = channelFor({ channel: opts.channel, purpose });
  const feature = opts.feature ?? "general";

  // Per-call override takes precedence — but only if the user has a key
  // for it. Then the model chosen for this purpose, then the workspace
  // active provider.
  let active: import("./api-keys").ActiveProvider | null = null;
  let purposeModel: string | undefined;
  if (opts.providerOverride && (await providerUsable(opts.providerOverride))) {
    active = opts.providerOverride;
  }
  if (!active && !opts.modelOverride && purpose) {
    const chosen = normalizePurposeModel(
      await getSetting<unknown>(purposeSettingKey(purpose) as `ai.model.${string}`).catch(() => null),
    );
    if (chosen && (await providerUsable(chosen.provider))) {
      active = chosen.provider;
      purposeModel = chosen.model || undefined;
    }
  }
  if (!active) active = await getActiveProvider();
  if (!active) return { ok: false, failure: noProviderFailure() };

  // Guardrails on what leaves the server: the user's text and any
  // conversation turns. The system prompt is ours and is not checked.
  const guard = await loadGuardrails();
  const inKinds: Record<string, number> = {};
  let inBlocked = false;
  const guardIn = (text: string): string => {
    const r = guardText(text, guard, "in");
    if (r.action === "pass") return text;
    for (const [k, n] of Object.entries(summarize(r.findings))) inKinds[k] = (inKinds[k] ?? 0) + (n ?? 0);
    if (r.action === "block") inBlocked = true;
    return r.text;
  };
  const guardedUser = guardIn(opts.user);
  const guardedMessages = opts.messages?.map((m) =>
    m.role === "user" ? { ...m, content: guardIn(m.content) } : m,
  );
  if (Object.keys(inKinds).length > 0) {
    recordIncident({
      direction: "in",
      action: inBlocked ? "block" : "mask",
      kinds: inKinds,
      feature,
      channel,
      clientId: opts.clientId ?? null,
    });
  }
  if (inBlocked) {
    void logAiCall({
      feature,
      provider: active,
      model: null,
      promptText: "",
      completionText: null,
      status: "blocked_by_guardrail",
      errorMsg: "Blocked by a local guardrail before sending.",
      clientId: opts.clientId ?? null,
      channel,
    });
    return { ok: false, failure: guardrailFailure("in") };
  }

  // Enforce monthly cap if set
  const cap = await checkMonthlyCap();
  if (cap.capped) {
    void logAiCall({
      channel,
      feature,
      provider: active,
      model: null,
      promptText: logPreview(guardedUser),
      completionText: null,
      status: "blocked_by_cap",
      errorMsg: `Monthly AI cap of $${cap.capUsd?.toFixed(2)} reached.`,
      clientId: opts.clientId ?? null,
    });
    return { ok: false, failure: monthlyCapFailure(cap.capUsd ?? null) };
  }

  let system = opts.system;
  let max = opts.maxTokens ?? 2000;
  let temperature = opts.temperature ?? 0.6;
  const timeoutMs = opts.timeoutMs ?? 60_000;

  // Memory + cost ceiling. A 16k-token response is ~64 KB of string and
  // covers any single AI feature we ship. Anything higher is almost
  // certainly a feature-spec mistake; cap silently rather than letting
  // a runaway prompt eat memory + cost.
  const HARD_TOKEN_CEILING = 16_000;
  if (max > HARD_TOKEN_CEILING) max = HARD_TOKEN_CEILING;

  // Truncate runaway user prompts. Cap at ~50k chars (~12k tokens). Most
  // legitimate prompts are under 5k chars; anything bigger usually means
  // a content-pasting tool forgot to summarize.
  const HARD_USER_CHARS = 50_000;
  const clip = (t: string) =>
    t.length > HARD_USER_CHARS ? t.slice(0, HARD_USER_CHARS) + "\n\n[truncated]" : t;
  const safeUser = clip(guardedUser);
  // A conversation keeps its most recent turns within the same budget.
  let safeMessages: { role: "user" | "assistant"; content: string }[] | undefined;
  if (guardedMessages && guardedMessages.length > 0) {
    safeMessages = [];
    let budget = HARD_USER_CHARS;
    for (let i = guardedMessages.length - 1; i >= 0 && budget > 0; i--) {
      const m = guardedMessages[i];
      const content = m.content.length > budget ? m.content.slice(-budget) : m.content;
      budget -= content.length;
      safeMessages.unshift({ ...m, content });
    }
    while (safeMessages.length > 0 && safeMessages[0].role !== "user") safeMessages.shift();
  }

  if (!opts.ignoreCreditSaver) {
    const saver = await getSetting<boolean>("ai.credit_saver.enabled");
    if (saver) {
      system = `Credit-saver mode: keep your answer to 2-4 short sentences. Skip pleasantries, headers, and preamble. Lead with the most useful information first.\n\n${system}`;
      max = Math.min(max, 500);
      temperature = Math.min(temperature, 0.3);
    }
  }

  // Inject learned style rules from the feedback-driven preference store.
  // Silent on failure — never let the learning layer break the call.
  if (opts.feature) {
    try {
      const { getStylePromptForFeature } = await import("./ai-learn");
      const stylePrompt = await getStylePromptForFeature({
        // Features with no learned rules (assistant, import) simply find none.
        feature: opts.feature as import("./ai-learn").AiFeature,
        clientId: opts.clientId,
      });
      if (stylePrompt) {
        system = `${system}\n\n${stylePrompt}`;
      }
    } catch {
      // ignore
    }
  }

  // Wrap dispatch with logging — each path returns (text, model)
  const start = Date.now();
  let model: string | null = null;
  let text: string | null = null;
  let errorMsg: string | undefined;

  // Precedence: what this call asked for, then what the user chose in
  // Settings, then the provider's first preset. The middle one did not
  // exist, so a preference set anywhere was forgotten on the next call.
  const savedModel = (await getSetting<string>("ai.default_model"))?.trim();
  const pickedModel =
    opts.modelOverride?.trim() ||
    purposeModel ||
    (savedModel && isModelForProvider(active, savedModel) ? savedModel : "") ||
    defaultModelFor(active);

  // Captured by the dispatch layer when a provider rejects the call.
  // Without this, a retired model id, a bad key, and a network blip all
  // arrived at the UI as the same nothing.
  let providerError: { status: number; body: string } | null = null;

  // Acquire one of the global AI permits. Caps workspace-wide
  // concurrency so the daily-agent's batch generations don't burst
  // the provider's rate limit and break a manual user action that
  // happens to fire at the same moment. Permits are auto-released
  // in finally even when the dispatch throws.
  await withAiPermit(async () => {
    try {
      // Single dispatch call — every provider (gemini, anthropic, openai,
      // groq, openrouter, perplexity, ollama, mistral, deepseek, cerebras,
      // together, github) is defined in provider-dispatch.ts. Adding a new
      // provider means one registry entry, not a new branch here.
      model = pickedModel;
      text = await dispatchProviderCall(active!, {
        system,
        user: safeUser,
        messages: safeMessages,
        model: pickedModel,
        maxTokens: max,
        temperature,
        timeoutMs,
        caller: "ai-call",
        onFailure: (status, body) => {
          providerError = { status, body };
        },
      });
    } catch (err) {
      errorMsg = (err as Error).message;
      text = null;
    }
  });

  // Resolve the failure BEFORE logging so ai_usage_log records the same
  // human-readable reason the user was shown — makes Settings → AI usage
  // a usable debugging surface instead of a wall of nulls.
  const failure: AiFailure | null = text
    ? null
    : providerError
      ? classifyProviderError(
          (providerError as { status: number; body: string }).status,
          (providerError as { status: number; body: string }).body,
          { provider: active, model: pickedModel },
        )
      : errorMsg
        ? classifyProviderError(0, errorMsg, {
            provider: active,
            model: pickedModel,
          })
        : emptyResponseFailure(active, pickedModel);

  // Log every call (success or failure) — async-fire, never block.
  //
  // promptTokens is estimated from `opts.user` at full length, not the
  // 300-char logging preview. Estimating from the preview under-counted
  // prompt tokens by orders of magnitude, so spend tracking and the
  // monthly cap were both computed from a number that had no relation
  // to what was actually sent.
  // Guardrails on the answer: blocked terms and sensitive data.
  let outBlocked = false;
  if (text) {
    const r = guardText(text, guard, "out");
    if (r.action !== "pass") {
      recordIncident({
        direction: "out",
        action: r.action,
        kinds: summarize(r.findings) as Record<string, number>,
        feature,
        channel,
        clientId: opts.clientId ?? null,
      });
      if (r.action === "block") outBlocked = true;
      else text = r.text;
    }
  }

  const sentText = safeMessages ? safeMessages.map((m) => m.content).join("\n\n") : safeUser;
  void logAiCall({
    feature,
    provider: active,
    model,
    promptText: logPreview(`${system}\n\n${sentText}`),
    promptTokens: estimateTokens(`${system}\n\n${sentText}`),
    completionText: text,
    latencyMs: Date.now() - start,
    clientId: opts.clientId ?? null,
    status: text ? "ok" : "error",
    errorMsg: failure?.message ?? errorMsg,
    channel,
  });

  if (outBlocked) return { ok: false, failure: guardrailFailure("out") };
  if (text) return { ok: true, text, provider: active, model };
  return { ok: false, failure: failure ?? emptyResponseFailure(active, pickedModel) };
}

// Provider-specific callers moved to src/lib/provider-dispatch.ts.
// Everything above this line goes through dispatchProviderCall().
