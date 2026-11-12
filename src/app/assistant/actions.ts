"use server";

import { actionTx } from "@/lib/action-tx";
import { requireSignedIn } from "@/lib/action-guard";

import { desc, eq, ne, count } from "drizzle-orm";
import { db } from "@/db/client";
import { callAIResult } from "@/lib/ai-call";
import { PROVIDER_LABEL } from "@/lib/ai-model-presets";
import {
  audits,
  auditIssues,
  clients,
  keywordRankings,
  keywords,
  pageChanges,
  monitoredPages,
  tasks,
} from "@/db/schema";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResult =
  | { ok: true; reply: string; provider: string }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `You are an SEO assistant embedded in the user's local SEO tool.
You have read access to a snapshot of their data (provided in <context>).

Style:
- Plain language. Direct. Short paragraphs. Use bullets where helpful.
- When you reference a fact, ground it in the data — name the client, the score, the keyword, etc.
- If the user asks about something you don't have data for, say so plainly.
- Never invent numbers. If a metric isn't in the context, say "I don't have that data — try connecting GSC or running an audit first."
- For SEO advice, prefer Google's confirmed guidance over folklore. Skip "keyword density" and similar myths.
- Don't pad. 4 short sentences usually beats a wall of text.`;

async function loadContext(): Promise<string> {
  const lines: string[] = [];

  // Clients overview
  const clientList = await db
    .select({
      id: clients.id,
      name: clients.name,
      url: clients.url,
      niche: clients.niche,
      techStack: clients.techStack,
    })
    .from(clients)
    .limit(20);
  if (clientList.length === 0) {
    lines.push("No clients added yet.");
  } else {
    lines.push(`# Clients (${clientList.length})`);
    for (const c of clientList) {
      lines.push(
        `- ${c.name} · ${c.url} · niche=${c.niche ?? "—"} · stack=[${(c.techStack ?? []).join(", ")}]`,
      );
    }
  }

  // Recent audits
  const recentAudits = await db
    .select({
      id: audits.id,
      clientName: clients.name,
      score: audits.score,
      issuesCount: audits.issuesCount,
      status: audits.status,
      completedAt: audits.completedAt,
    })
    .from(audits)
    .leftJoin(clients, eq(audits.clientId, clients.id))
    .orderBy(desc(audits.createdAt))
    .limit(8);
  if (recentAudits.length > 0) {
    lines.push(`\n# Recent audits`);
    for (const a of recentAudits) {
      lines.push(
        `- audit#${a.id} · ${a.clientName ?? "—"} · score=${a.score ?? "—"} · ${a.issuesCount} issues · ${a.status} · ${a.completedAt?.toLocaleDateString() ?? "—"}`,
      );
    }
  }

  // Top issues from latest audits per client
  const topIssues = await db
    .select({
      type: auditIssues.type,
      severity: auditIssues.severity,
      message: auditIssues.message,
      url: auditIssues.url,
    })
    .from(auditIssues)
    .where(ne(auditIssues.status, "resolved"))
    .orderBy(desc(auditIssues.createdAt))
    .limit(15);
  if (topIssues.length > 0) {
    lines.push(`\n# Recent open issues (from audits)`);
    for (const i of topIssues) {
      lines.push(`- [${i.severity}] ${i.type}: ${i.message.slice(0, 120)}`);
    }
  }

  // Open tasks summary
  const [{ value: openTaskCount }] = await db
    .select({ value: count() })
    .from(tasks)
    .where(ne(tasks.status, "done"));
  const topOpenTasks = await db
    .select({
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      clientName: clients.name,
    })
    .from(tasks)
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(ne(tasks.status, "done"))
    .orderBy(desc(tasks.createdAt))
    .limit(10);
  if (openTaskCount > 0) {
    lines.push(`\n# Open tasks (${openTaskCount} total, top 10)`);
    for (const t of topOpenTasks) {
      lines.push(
        `- [${t.priority}] ${t.title} · ${t.clientName ?? "—"}${t.dueDate ? ` · due ${t.dueDate.toLocaleDateString()}` : ""}`,
      );
    }
  }

  // Tracked keywords with latest position
  const allKw = await db
    .select({
      id: keywords.id,
      query: keywords.query,
      country: keywords.country,
      clientName: clients.name,
    })
    .from(keywords)
    .leftJoin(clients, eq(keywords.clientId, clients.id))
    .limit(30);
  const allRankings = await db
    .select({
      keywordId: keywordRankings.keywordId,
      position: keywordRankings.position,
      checkedAt: keywordRankings.checkedAt,
    })
    .from(keywordRankings)
    .orderBy(keywordRankings.checkedAt);
  const latestPos = new Map<number, number | null>();
  for (const r of allRankings) latestPos.set(r.keywordId, r.position);
  if (allKw.length > 0) {
    lines.push(`\n# Tracked keywords (${allKw.length})`);
    for (const k of allKw.slice(0, 20)) {
      const pos = latestPos.get(k.id);
      lines.push(
        `- "${k.query}" · ${k.country} · ${k.clientName ?? "—"} · latest pos=${pos ?? "—"}`,
      );
    }
  }

  // Recent page changes
  const recentChanges = await db
    .select({
      field: pageChanges.field,
      oldValue: pageChanges.oldValue,
      newValue: pageChanges.newValue,
      detectedAt: pageChanges.detectedAt,
      url: monitoredPages.url,
      clientName: clients.name,
    })
    .from(pageChanges)
    .leftJoin(
      monitoredPages,
      eq(pageChanges.monitoredPageId, monitoredPages.id),
    )
    .leftJoin(clients, eq(monitoredPages.clientId, clients.id))
    .orderBy(desc(pageChanges.detectedAt))
    .limit(8);
  if (recentChanges.length > 0) {
    lines.push(`\n# Recent page changes`);
    for (const c of recentChanges) {
      if (c.field === "content") continue;
      lines.push(
        `- ${c.field} on ${c.url}: "${(c.oldValue ?? "—").slice(0, 50)}" → "${(c.newValue ?? "—").slice(0, 50)}"`,
      );
    }
  }

  return lines.join("\n");
}

const MAX_CONTEXT_CHARS = 8_000;

function buildSystem(context: string): string {
  return `${SYSTEM_PROMPT}\n\n<context>\n${context.slice(0, MAX_CONTEXT_CHARS)}\n</context>`;
}

export async function chat(history: ChatMessage[]): Promise<ChatResult> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_assistant_actions");
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return { ok: false, error: tx("noUserMessageToRespond") };
  }

  const context = await loadContext();
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
  // cost log, the guardrails and the model chosen for conversations in
  // Settings → AI apply here too. This assistant used to call each
  // provider itself and skipped all four.
  const last = history[history.length - 1];
  const res = await callAIResult({
    system: buildSystem(context),
    user: last.content,
    messages: history.slice(-20),
    feature: "assistant",
    purpose: "chat",
    channel: "assistant",
    maxTokens: 800,
    temperature: 0.3,
    timeoutMs: 30_000,
  });
  if (res.ok) {
    const label = res.provider && res.provider in PROVIDER_LABEL
      ? PROVIDER_LABEL[res.provider as keyof typeof PROVIDER_LABEL]
      : (res.provider ?? active);
    return { ok: true, reply: res.text, provider: label };
  }
  return {
    ok: false,
    error: res.failure.message || tx("activeProviderDidnTRespond", { active }),
  };
}
