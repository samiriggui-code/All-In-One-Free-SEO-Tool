/**
 * Embedding calls, one wire format per provider. Called only by
 * `embedTexts` in lib/ai-call.ts, which adds the cap, the cost log and
 * the guardrails. Returns one vector per input, in order, or null.
 *
 *   - OpenAI and Mistral: POST /v1/embeddings { model, input: [...] }
 *   - Gemini: POST models/<m>:batchEmbedContents { requests: [...] }
 *   - Ollama: POST /api/embed { model, input: [...] }
 */

export type EmbedProvider = "openai" | "mistral" | "gemini" | "ollama";

export type EmbedArgs = {
  provider: EmbedProvider;
  model: string;
  texts: string[];
  apiKey?: string | null;
  ollamaUrl?: string | null;
  timeoutMs?: number;
  onFailure?: (status: number, body: string) => void;
};

const ENDPOINT: Record<"openai" | "mistral", string> = {
  openai: "https://api.openai.com/v1/embeddings",
  mistral: "https://api.mistral.ai/v1/embeddings",
};

export async function callEmbeddings(args: EmbedArgs): Promise<number[][] | null> {
  if (args.texts.length === 0) return [];
  const signal = AbortSignal.timeout(args.timeoutMs ?? 60_000);
  try {
    let res: Response;
    if (args.provider === "gemini") {
      const model = args.model.startsWith("models/") ? args.model : `models/${args.model}`;
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${model}:batchEmbedContents?key=${encodeURIComponent(args.apiKey ?? "")}`,
        {
          method: "POST",
          signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requests: args.texts.map((text) => ({ model, content: { parts: [{ text }] } })),
          }),
        },
      );
    } else if (args.provider === "ollama") {
      res = await fetch(`${args.ollamaUrl}/api/embed`, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: args.model, input: args.texts }),
      });
    } else {
      res = await fetch(ENDPOINT[args.provider], {
        method: "POST",
        signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${args.apiKey ?? ""}` },
        body: JSON.stringify({ model: args.model, input: args.texts }),
      });
    }
    if (!res.ok) {
      args.onFailure?.(res.status, (await res.text().catch(() => "")).slice(0, 240));
      return null;
    }
    const data = (await res.json()) as {
      data?: { embedding: number[]; index?: number }[];
      embeddings?: ({ values: number[] } | number[])[];
    };
    let vectors: number[][] | undefined;
    if (Array.isArray(data.data)) {
      vectors = [...data.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((d) => d.embedding);
    } else if (Array.isArray(data.embeddings)) {
      vectors = data.embeddings.map((e) => (Array.isArray(e) ? e : e.values));
    }
    if (!vectors || vectors.length !== args.texts.length) {
      args.onFailure?.(0, "unexpected embeddings response");
      return null;
    }
    return vectors;
  } catch (err) {
    args.onFailure?.(0, (err as Error).message);
    return null;
  }
}
