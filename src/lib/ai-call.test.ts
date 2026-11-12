import { beforeEach, describe, expect, it, vi } from "vitest";

const settings = new Map<string, unknown>();
const dispatch = vi.fn();
const logAiCall = vi.fn();
let capped = false;

vi.mock("./settings-store", () => ({
  getSetting: async (k: string) => settings.get(k) ?? null,
}));
vi.mock("./api-keys", () => ({
  getActiveProvider: async () => "gemini",
  getApiKey: async (p: string) => (p === "gemini" || p === "anthropic" ? "key" : null),
  getOllamaUrl: async () => null,
}));
vi.mock("./ai-usage", () => ({
  checkMonthlyCap: async () => ({ capped, capUsd: capped ? 5 : null, spentUsd: 0 }),
  logAiCall: (...a: unknown[]) => logAiCall(...a),
}));
vi.mock("./provider-dispatch", () => ({
  dispatchProviderCall: (...a: unknown[]) => dispatch(...a),
  defaultModelFor: (p: string) => `${p}-default`,
}));
vi.mock("./ai-learn", () => ({ getStylePromptForFeature: async () => null }));

const { callAIResult } = await import("./ai-call");

const IBAN = "FR76 3000 6000 0112 3456 7890 189";

beforeEach(() => {
  settings.clear();
  dispatch.mockReset();
  dispatch.mockResolvedValue("Réponse.");
  logAiCall.mockReset();
  capped = false;
});

describe("callAIResult", () => {
  it("uses the model chosen for the purpose when its provider has a key", async () => {
    settings.set("ai.model.chat", { provider: "anthropic", model: "claude-haiku-4-5" });
    const r = await callAIResult({ system: "s", user: "bonjour", purpose: "chat" });
    expect(r).toMatchObject({ ok: true, provider: "anthropic" });
    expect(dispatch.mock.calls[0][0]).toBe("anthropic");
    expect(dispatch.mock.calls[0][1].model).toBe("claude-haiku-4-5");
    expect(logAiCall.mock.calls[0][0].channel).toBe("assistant");
  });

  it("falls back to the workspace provider when the purpose's provider has no key", async () => {
    settings.set("ai.model.writing", { provider: "openai", model: "gpt-4o-mini" });
    await callAIResult({ system: "s", user: "x", feature: "blog_draft" });
    expect(dispatch.mock.calls[0][0]).toBe("gemini");
  });

  it("sends a whole conversation", async () => {
    const messages = [
      { role: "user" as const, content: "Q1" },
      { role: "assistant" as const, content: "R1" },
      { role: "user" as const, content: "Q2" },
    ];
    await callAIResult({ system: "s", user: "Q2", messages, purpose: "chat" });
    expect(dispatch.mock.calls[0][1].messages).toEqual(messages);
  });

  it("masks bank details before they leave, by default", async () => {
    await callAIResult({ system: "s", user: `Mon IBAN est ${IBAN}` });
    const sent = dispatch.mock.calls[0][1].user as string;
    expect(sent).toContain("[IBAN masqué]");
    expect(sent).not.toContain("FR76");
  });

  it("refuses to send in block mode", async () => {
    settings.set("guardrails.mode", "block");
    const r = await callAIResult({ system: "s", user: `IBAN ${IBAN}` });
    expect(r).toMatchObject({ ok: false, failure: { reason: "guardrail_blocked" } });
    expect(dispatch).not.toHaveBeenCalled();
    expect(logAiCall.mock.calls[0][0].status).toBe("blocked_by_guardrail");
  });

  it("masks a blocked term in the answer", async () => {
    settings.set("guardrails.blocked_terms", ["Concurrent X"]);
    dispatch.mockResolvedValue("Comparez avec Concurrent X.");
    const r = await callAIResult({ system: "s", user: "?" });
    expect(r).toMatchObject({ ok: true, text: "Comparez avec [terme masqué]." });
  });

  it("stops at the monthly cap without calling the provider", async () => {
    capped = true;
    const r = await callAIResult({ system: "s", user: "?", purpose: "chat" });
    expect(r).toMatchObject({ ok: false, failure: { reason: "monthly_cap" } });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
