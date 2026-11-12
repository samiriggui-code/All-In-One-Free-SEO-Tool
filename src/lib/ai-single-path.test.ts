import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every AI call goes through lib/ai-call.ts, so the monthly cap, the
 * cost log, the guardrails and the model chosen per use apply to all of
 * them. The floating assistant once called providers itself and skipped
 * all four; this test fails the day a file does that again.
 *
 * A file may talk to a provider directly only if it is listed below, with
 * the reason it cannot go through callAI.
 */
const ALLOWED: Record<string, string> = {
  "src/lib/ai-call.ts": "the single path itself",
  "src/lib/provider-dispatch.ts": "wire protocol for each provider, called only by ai-call",
  "src/lib/api-providers.ts": "catalogue of providers (names, key pages, base URLs)",
  "src/lib/ai-vision.ts": "image input needs multimodal payloads; it checks the cap, logs and applies the guardrails itself",
  "src/lib/llm-citation.ts": "AI visibility measures a given provider with its own web search, so the provider is the subject of the test; it checks the cap and logs",
  "src/app/api/test-provider/route.ts": "the 'Test key' button: a one-token ping to check a key, never a feature",
};

const ROOT = join(__dirname, "..", "..");
const SRC = join(ROOT, "src");

const PROVIDER_IMPORT = /from\s+["'](?:\.\.?\/|@\/lib\/)(?:lib\/)?(?:providers\/|provider-dispatch["'])/;
const PROVIDER_ENDPOINT =
  /api\.openai\.com\/v1\/(?:chat|responses)|api\.anthropic\.com\/v1\/messages|generativelanguage\.googleapis\.com\/v1beta\/models|openrouter\.ai\/api\/v1\/chat|api\.groq\.com\/openai|api\.perplexity\.ai\/chat|api\.mistral\.ai\/v1\/chat|api\.deepseek\.com|api\.cerebras\.ai|api\.together\.xyz|models\.inference\.ai\.azure\.com/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe("one path for AI calls", () => {
  it("no file outside the allowed list calls an AI provider directly", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).split("\\").join("/");
      if (rel.startsWith("src/lib/providers/") || rel in ALLOWED) continue;
      const code = readFileSync(file, "utf8");
      if (PROVIDER_IMPORT.test(code) || PROVIDER_ENDPOINT.test(code)) offenders.push(rel);
    }
    expect(offenders, "call lib/ai-call.ts (callAI / callAIResult) instead").toEqual([]);
  });

  it("the allowed list holds no stale entry", () => {
    for (const rel of Object.keys(ALLOWED)) {
      expect(() => statSync(join(ROOT, rel)), rel).not.toThrow();
    }
  });

  it("the floating assistant goes through callAI", () => {
    const code = readFileSync(join(SRC, "app/assistant/actions.ts"), "utf8");
    expect(code).toMatch(/callAIResult\(/);
    expect(code).not.toMatch(/fetch\(/);
  });
});
