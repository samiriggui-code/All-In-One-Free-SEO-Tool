"use server";

import { actionTx } from "@/lib/action-tx";
import { requireSignedIn } from "@/lib/action-guard";
import { getLocale } from "next-intl/server";
import { PROVIDER_LABEL } from "@/lib/ai-model-presets";
import { currentUser, requireClientAccess } from "@/lib/auth";
import { db } from "@/db/client";
import { aiApprovals } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PendingAction, ToolStep } from "@/lib/assistant/engine";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResult =
  | { ok: true; reply: string; provider: string; steps: ToolStep[]; pending?: PendingAction; conversationId: number | null }
  | { ok: false; error: string };

export async function chat(
  history: ChatMessage[],
  opts: { clientId?: number | null; conversationId?: number | null } = {},
): Promise<ChatResult> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_assistant_actions");
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return { ok: false, error: tx("noUserMessageToRespond") };
  }

  const { getActiveProvider } = await import("@/lib/api-keys");

  const active = await getActiveProvider();
  if (!active) {
    // Says the useful thing when a chat app is already connected.
    //
    // Somebody who has just connected Claude Desktop reads the plain
    // version as the setup having failed. It has not: MCP lets their
    // chat app call in here, which is the opposite direction to what
    // this assistant needs. They can have the same answer right now by
    // asking it there, and the message should say so instead of sending
    // them back to a settings screen that already looks done.
    const { getAiAvailability } = await import("@/lib/ai-availability");
    const ai = await getAiAvailability().catch(() => null);

    if (ai?.hasSubscription) {
      return {
        ok: false,
        error:
          tx("chatAppConnectedNeedsKey", { client: ai.client ?? tx("yourChatApp") }) +
          "\n\n" +
          tx("askThereMeanwhile") +
          "\n\n" +
          tx("toAnswerItHereInstead"),
      };
    }

    return {
      ok: false,
      error:
        tx("noActiveAiProviderOpen"),
    };
  }

  // One path for every AI call (lib/ai-call.ts): the monthly cap, the
  // cost log, the guardrails and the model chosen for conversations.
  // The assistant looks data up with the same tools as the MCP server,
  // within the signed-in person's rights, and proposes changes for them
  // to confirm instead of making them.
  const last = history[history.length - 1];
  const { runAssistant } = await import("@/lib/assistant/engine");
  const res = await runAssistant(history, {
    user: await currentUser(),
    clientId: opts.clientId ?? null,
    locale: await getLocale(),
  });
  if (res.ok) {
    const label = res.provider && res.provider in PROVIDER_LABEL
      ? PROVIDER_LABEL[res.provider as keyof typeof PROVIDER_LABEL]
      : (res.provider ?? active);
    // Kept in Conversations (/chats), like the other chats.
    const shown = res.pending ? `${res.reply ? `${res.reply}\n\n` : ""}→ ${res.pending.summary}` : res.reply;
    const { saveChatTurn } = await import("@/lib/chat-store");
    const conversationId = await saveChatTurn({
      conversationId: opts.conversationId ?? null,
      kind: "assistant",
      clientId: opts.clientId ?? null,
      userMessage: last.content,
      assistantReply: shown,
    }).catch(() => opts.conversationId ?? null);
    return { ok: true, reply: res.reply, provider: label, steps: res.steps, pending: res.pending, conversationId };
  }
  return {
    ok: false,
    error:
      res.error === "too_many_steps"
        ? tx("tooManySteps")
        : res.error || tx("activeProviderDidnTRespond", { active }),
  };
}

export type DecideResult =
  | { ok: true; status: "approved" | "rejected"; message: string }
  | { ok: false; error: string };

/** The person's answer to a change the assistant proposed. */
export async function decideAssistantAction(id: number, approve: boolean): Promise<DecideResult> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_assistant_actions");
  const [row] = await db.select().from(aiApprovals).where(eq(aiApprovals.id, Number(id))).limit(1);
  if (!row) return { ok: false, error: tx("approvalMissing") };
  // Edit rights on the client, checked again now: the proposal was made
  // in a chat, the change happens here.
  if (row.clientId !== null) await requireClientAccess(row.clientId, { edit: true });
  const me = await currentUser();
  if (row.userId !== null && me && row.userId !== me.id) return { ok: false, error: tx("approvalMissing") };
  const { decideApproval } = await import("@/lib/assistant/engine");
  const r = await decideApproval(row.id, approve);
  if (!r.ok) {
    const known = ["expired", "already_decided", "not_found"].includes(r.error);
    return { ok: false, error: known ? tx(`approval_${r.error}`) : tx("approvalFailed", { error: r.error.slice(0, 300) }) };
  }
  return {
    ok: true,
    status: r.status === "approved" ? "approved" : "rejected",
    message: r.status === "approved" ? tx("approvalDone") : tx("approvalRejected"),
  };
}
