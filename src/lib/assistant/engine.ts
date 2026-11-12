/**
 * The one assistant: the conversation, the 22 tools the MCP server
 * already exposes, and the client's knowledge base, through callAI.
 *
 * Reading runs straight away, inside the person's own rights (a client
 * they cannot see is refused, list_clients only lists theirs). Anything
 * that changes data is never run here: it becomes a pending row in
 * ai_approvals and the person confirms it in the chat.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentActions, aiApprovals, clients } from "@/db/schema";
import type { User } from "@/db/schema";
import { canSeeClient, userMayEdit, visibleClientIds } from "@/lib/auth";
import { MCP_TOOL_LIST, findMcpTool } from "@/lib/mcp/server";
import { parseToolCall, toolCatalog, toolResultMessage, TOOL_RULES, type ToolSpec } from "./protocol";

export type Turn = { role: "user" | "assistant"; content: string };

export type ToolStep = { tool: string; ok: boolean };

export type PendingAction = { id: number; tool: string; summary: string };

export type AssistantReply =
  | { ok: true; reply: string; provider?: string; steps: ToolStep[]; pending?: PendingAction }
  | { ok: false; error: string; steps: ToolStep[] };

const MAX_STEPS = 5;

const KB_TOOL: ToolSpec = {
  name: "search_knowledge",
  description:
    "Search the client's knowledge base: profile, latest audits, articles, briefs, and the notes, pages and files the team added. Returns the best passages with their document title. Use it for any question about what the business does, says or has written.",
  inputSchema: {
    properties: { clientId: { type: "number" }, query: { type: "string" }, limit: { type: "number" } },
    required: ["clientId", "query"],
  },
  readOnly: true,
};

type McpLikeResult = { ok: true; data: unknown } | { ok: false; error: string };

/**
 * Changes the assistant can propose that are not MCP tools. Like every
 * write, they only run once the person confirms.
 */
const LOCAL_WRITE_TOOLS: (ToolSpec & { run: (a: Record<string, unknown>, userId: number | null) => Promise<McpLikeResult> })[] = [
  {
    name: "create_task",
    description:
      "Add a task to the client's to-do list (Tâches). Use when the person asks to plan or remember work to do on the site.",
    inputSchema: {
      properties: {
        clientId: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["high", "medium", "low"] },
        dueDate: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["clientId", "title"],
    },
    readOnly: false,
    run: async (a) => {
      const title = String(a.title ?? "").trim().slice(0, 200);
      if (!title) return { ok: false, error: "A task needs a title." };
      const due = typeof a.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? new Date(`${a.dueDate}T12:00:00Z`) : null;
      const priority = ["high", "medium", "low"].includes(String(a.priority)) ? (a.priority as "high" | "medium" | "low") : "medium";
      const { tasks } = await import("@/db/schema");
      const [row] = await db
        .insert(tasks)
        .values({
          clientId: Number(a.clientId),
          title,
          description: typeof a.description === "string" ? a.description.slice(0, 4000) : null,
          priority,
          dueDate: due,
        })
        .returning({ id: tasks.id });
      return { ok: true, data: { taskId: row.id } };
    },
  },
  {
    name: "save_note",
    description:
      "Save a note in the client's knowledge base (Connaissances), so it can be found later. Use when the person asks to keep or write down something about the client.",
    inputSchema: {
      properties: { clientId: { type: "number" }, title: { type: "string" }, text: { type: "string" } },
      required: ["clientId", "text"],
    },
    readOnly: false,
    run: async (a, userId) => {
      const text = String(a.text ?? "").trim().slice(0, 20_000);
      if (!text) return { ok: false, error: "The note is empty." };
      const { upsertDocument } = await import("@/lib/kb/store");
      const { randomUUID } = await import("node:crypto");
      const r = await upsertDocument({
        clientId: Number(a.clientId),
        sourceType: "note",
        sourceId: randomUUID(),
        title: String(a.title ?? "").trim().slice(0, 200) || text.split("\n")[0].slice(0, 80),
        text,
        manual: true,
        createdBy: userId,
      });
      return { ok: true, data: r };
    },
  },
];

export function assistantTools(): ToolSpec[] {
  return [
    KB_TOOL,
    ...LOCAL_WRITE_TOOLS.map(({ run: _run, ...spec }) => spec),
    ...MCP_TOOL_LIST.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as ToolSpec["inputSchema"],
      readOnly: t.annotations.readOnlyHint !== false,
    })),
  ];
}

/** Which client a call is about: its clientId, or the client of the fix/action it names. */
export async function clientOfCall(args: Record<string, unknown>): Promise<number | null> {
  const direct = Number(args.clientId);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const actionId = Number(args.fixId ?? args.actionId);
  if (Number.isInteger(actionId) && actionId > 0) {
    const [row] = await db
      .select({ clientId: agentActions.clientId })
      .from(agentActions)
      .where(eq(agentActions.id, actionId))
      .limit(1);
    return row?.clientId ?? null;
  }
  return null;
}

function describeCall(name: string, args: Record<string, unknown>): string {
  const parts = Object.entries(args)
    .filter(([k]) => k !== "clientId")
    .map(([k, v]) => {
      const s = typeof v === "string" ? v : JSON.stringify(v);
      return `${k} = ${s.length > 160 ? `${s.slice(0, 157)}…` : s}`;
    });
  return parts.length ? `${name} (${parts.join(" ; ")})` : name;
}

type RunOpts = { user: User | null; clientId?: number | null; locale?: string };

async function runReadTool(name: string, args: Record<string, unknown>, opts: RunOpts): Promise<unknown> {
  if (name === "list_clients") {
    const visible = await visibleClientIds(opts.user);
    const rows = await db.select({ id: clients.id, name: clients.name, url: clients.url, niche: clients.niche }).from(clients);
    return visible === null ? rows : rows.filter((r) => visible.includes(r.id));
  }
  const clientId = await clientOfCall(args);
  if (clientId === null) return { error: "This tool needs a clientId. Call list_clients first." };
  if (!(await canSeeClient(opts.user, clientId))) return { error: `No client with id ${clientId}.` };

  if (name === KB_TOOL.name) {
    const { searchKnowledge } = await import("@/lib/kb/store");
    const hits = await searchKnowledge(clientId, String(args.query ?? ""), Math.min(8, Number(args.limit) || 6), {
      channel: "assistant",
    });
    return hits.length
      ? hits.map((h) => ({ document: h.title, section: h.heading, type: h.sourceType, url: h.url, text: h.text.slice(0, 1200) }))
      : { note: "Nothing in the knowledge base matches. Say so rather than guessing." };
  }
  const tool = findMcpTool(name);
  if (!tool) return { error: `No such tool: ${name}` };
  const r = await tool.run({ ...args, clientId });
  return r.ok ? r.data : { error: r.error };
}

async function propose(name: string, args: Record<string, unknown>, opts: RunOpts): Promise<PendingAction | string> {
  const clientId = await clientOfCall(args);
  if (clientId === null) return "This change needs a clientId (or a fixId/actionId that exists).";
  if (!(await canSeeClient(opts.user, clientId))) return `No client with id ${clientId}.`;
  if (!userMayEdit(opts.user)) return "The person you are talking to has read-only access: they cannot make this change.";
  const summary = describeCall(name, args);
  const [row] = await db
    .insert(aiApprovals)
    .values({ tool: name, args, summary, clientId, userId: opts.user?.id ?? null })
    .returning({ id: aiApprovals.id });
  return { id: row.id, tool: name, summary };
}

async function systemPrompt(opts: RunOpts): Promise<string> {
  let here = "";
  if (opts.clientId && (await canSeeClient(opts.user, opts.clientId))) {
    const [c] = await db.select({ name: clients.name, url: clients.url }).from(clients).where(eq(clients.id, opts.clientId)).limit(1);
    if (c) here = `\nThe person is looking at client #${opts.clientId}, ${c.name} (${c.url}). Questions without a client name are about this one.`;
  }
  const lang = opts.locale === "en" ? "English" : "French";
  return `You are the SEO assistant built into rank_forge, the agency's SEO workspace.
Answer in ${lang} unless the person writes in another language.
Style: plain language, direct, short paragraphs, bullets when useful. Ground every fact in the data you looked up (client, score, keyword, date). If the data is not there, say so plainly. Prefer Google's confirmed guidance over SEO folklore.${here}

${TOOL_RULES}

Available tools:
${toolCatalog(assistantTools())}`;
}

/**
 * One assistant answer. Calls tools until the model answers in prose,
 * proposes a change, or MAX_STEPS is reached.
 */
export async function runAssistant(history: Turn[], opts: RunOpts): Promise<AssistantReply> {
  const { callAIResult } = await import("@/lib/ai-call");
  const system = await systemPrompt(opts);
  const turns: Turn[] = history.slice(-20).map((t) => ({ role: t.role, content: t.content }));
  const steps: ToolStep[] = [];
  const specs = new Map(assistantTools().map((t) => [t.name, t]));

  for (let i = 0; i <= MAX_STEPS; i++) {
    const last = turns[turns.length - 1];
    const res = await callAIResult({
      system,
      user: last.content,
      messages: turns,
      feature: "assistant",
      purpose: "chat",
      channel: "assistant",
      clientId: opts.clientId ?? null,
      maxTokens: 1200,
      temperature: 0.2,
      timeoutMs: 45_000,
    });
    if (!res.ok) return { ok: false, error: res.failure.message, steps };

    const call = parseToolCall(res.text);
    if (call && i === MAX_STEPS) break;
    if (!call) {
      const reply = res.text.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "").trim();
      return { ok: true, reply, provider: res.provider, steps };
    }

    turns.push({ role: "assistant", content: `<tool_call>${JSON.stringify({ name: call.name, arguments: call.args })}</tool_call>` });
    const spec = specs.get(call.name);
    if (!spec) {
      steps.push({ tool: call.name, ok: false });
      turns.push({ role: "user", content: toolResultMessage(call.name, { error: `No such tool: ${call.name}` }) });
      continue;
    }

    if (!spec.readOnly) {
      const p = await propose(call.name, call.args, opts);
      if (typeof p === "string") {
        steps.push({ tool: call.name, ok: false });
        turns.push({ role: "user", content: toolResultMessage(call.name, { error: p }) });
        continue;
      }
      steps.push({ tool: call.name, ok: true });
      return { ok: true, reply: "", provider: res.provider, steps, pending: p };
    }

    let payload: unknown;
    try {
      payload = await runReadTool(call.name, call.args, opts);
    } catch (err) {
      payload = { error: (err as Error).message };
    }
    const failed = !!payload && typeof payload === "object" && "error" in (payload as object);
    steps.push({ tool: call.name, ok: !failed });
    turns.push({ role: "user", content: toolResultMessage(call.name, payload) });
  }
  return { ok: false, error: "too_many_steps", steps };
}

/** Run or refuse a pending change. The caller has checked edit rights on its client. */
export async function decideApproval(
  id: number,
  approve: boolean,
): Promise<{ ok: true; status: string; result?: unknown } | { ok: false; error: string }> {
  const [row] = await db.select().from(aiApprovals).where(eq(aiApprovals.id, id)).limit(1);
  if (!row) return { ok: false, error: "not_found" };
  if (row.status !== "pending") return { ok: false, error: "already_decided" };
  if (Date.now() - row.createdAt.getTime() > 24 * 3600_000) {
    await db.update(aiApprovals).set({ status: "expired", decidedAt: new Date() }).where(eq(aiApprovals.id, id));
    return { ok: false, error: "expired" };
  }
  if (!approve) {
    await db.update(aiApprovals).set({ status: "rejected", decidedAt: new Date() }).where(eq(aiApprovals.id, id));
    return { ok: true, status: "rejected" };
  }
  // Claim the row first so a double click cannot run the change twice.
  const claimed = db
    .update(aiApprovals)
    .set({ status: "running", decidedAt: new Date() })
    .where(eq(aiApprovals.id, id))
    .returning({ status: aiApprovals.status })
    .all();
  if (claimed.length === 0) return { ok: false, error: "already_decided" };
  const local = LOCAL_WRITE_TOOLS.find((t) => t.name === row.tool);
  const tool = local ? { run: (a: Record<string, unknown>) => local.run(a, row.userId) } : findMcpTool(row.tool);
  let status = "failed";
  let result: unknown;
  try {
    // Knowledge written from the chat says so, rather than "mcp".
    const args = { ...row.args };
    if ((row.tool === "update_client_knowledge" || row.tool === "log_client_research") && !args.by) args.by = "assistant";
    const r = tool ? await tool.run(args) : { ok: false as const, error: `No such tool: ${row.tool}` };
    status = r.ok ? "approved" : "failed";
    result = r.ok ? r.data : r.error;
  } catch (err) {
    result = (err as Error).message;
  }
  await db
    .update(aiApprovals)
    .set({ status, result: typeof result === "string" ? result : JSON.stringify(result ?? null) })
    .where(eq(aiApprovals.id, id));
  return status === "approved" ? { ok: true, status, result } : { ok: false, error: String(result ?? "failed") };
}
