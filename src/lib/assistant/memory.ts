/**
 * The assistant's memory (IA-4): short sentences it keeps between
 * conversations, for one person, the whole team, or one client.
 *
 * Nothing is hidden: every memory shows in Settings → Ma mémoire (and a
 * client's in its Connaissances page), where it can be edited, accepted,
 * refused or deleted. Only "active" memories reach the model.
 */

import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { aiMemories, clients, type AiMemory, type User } from "@/db/schema";
import { canSeeClient, userMayEdit, visibleClientIds } from "@/lib/auth";
import { getSetting } from "@/lib/settings-store";

export type MemoryScope = "user" | "team" | "client";
export type MemoryCategory = "preference" | "fact" | "instruction";

export const MEMORY_MAX_CHARS = 500;
/** Per scope, in the prompt. */
export const MEMORY_PROMPT_BUDGET = 2000;

const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").replace(/[.!\s]+$/, "").trim();

export async function memoryEnabledFor(user: User | null): Promise<boolean> {
  if (!user) return true;
  return (await getSetting<boolean>(`memory.user_off.${user.id}`)) !== true;
}

/** Every memory this person may see, newest first. */
export async function listVisibleMemories(user: User | null, opts: { clientId?: number } = {}): Promise<AiMemory[]> {
  const visible = await visibleClientIds(user);
  const clientCond =
    opts.clientId !== undefined
      ? eq(aiMemories.clientId, opts.clientId)
      : visible === null
        ? undefined
        : visible.length
          ? inArray(aiMemories.clientId, visible)
          : eq(aiMemories.id, -1);
  if (opts.clientId !== undefined) {
    if (!(await canSeeClient(user, opts.clientId))) return [];
    return db.select().from(aiMemories).where(and(eq(aiMemories.scope, "client"), clientCond)).orderBy(desc(aiMemories.updatedAt));
  }
  const mine = user ? eq(aiMemories.userId, user.id) : isNull(aiMemories.userId);
  return db
    .select()
    .from(aiMemories)
    .where(
      or(
        and(eq(aiMemories.scope, "user"), mine),
        eq(aiMemories.scope, "team"),
        clientCond ? and(eq(aiMemories.scope, "client"), clientCond) : eq(aiMemories.scope, "client"),
      ),
    )
    .orderBy(desc(aiMemories.updatedAt));
}

/** May this person change (edit, accept, delete) this memory? */
export async function mayChangeMemory(user: User | null, m: Pick<AiMemory, "scope" | "userId" | "clientId">): Promise<boolean> {
  if (m.scope === "user") return user ? m.userId === user.id : m.userId === null;
  if (!userMayEdit(user)) return false;
  if (m.scope === "client") return m.clientId !== null && (await canSeeClient(user, m.clientId));
  return true;
}

export type AddMemoryInput = {
  scope: MemoryScope;
  text: string;
  category?: MemoryCategory;
  clientId?: number | null;
  status?: "active" | "pending";
  source?: "manual" | "conversation" | "auto";
};

/**
 * Add a memory, unless the same sentence is already there for that
 * scope (a refused one counts: it is not offered again).
 */
export async function addMemory(
  user: User | null,
  input: AddMemoryInput,
): Promise<{ ok: true; id: number; duplicate: boolean } | { ok: false; error: "empty" | "too_long" | "forbidden" | "no_client" }> {
  const text = String(input.text ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, error: "empty" };
  if (text.length > MEMORY_MAX_CHARS) return { ok: false, error: "too_long" };
  const scope = input.scope;
  const clientId = scope === "client" ? Number(input.clientId) || null : null;
  if (scope === "client" && !clientId) return { ok: false, error: "no_client" };
  const owner = scope === "user" ? (user?.id ?? null) : null;
  if (!(await mayChangeMemory(user, { scope, userId: owner, clientId }))) return { ok: false, error: "forbidden" };

  const same = await db
    .select({ id: aiMemories.id, text: aiMemories.text })
    .from(aiMemories)
    .where(
      and(
        eq(aiMemories.scope, scope),
        owner === null ? isNull(aiMemories.userId) : eq(aiMemories.userId, owner),
        clientId === null ? isNull(aiMemories.clientId) : eq(aiMemories.clientId, clientId),
      ),
    );
  const dup = same.find((m) => norm(m.text) === norm(text));
  if (dup) return { ok: true, id: dup.id, duplicate: true };

  const [row] = await db
    .insert(aiMemories)
    .values({
      scope,
      userId: owner,
      clientId,
      text,
      category: input.category ?? "fact",
      status: input.status ?? "active",
      source: input.source ?? "manual",
      createdBy: user?.id ?? null,
    })
    .returning({ id: aiMemories.id });
  return { ok: true, id: row.id, duplicate: false };
}

export async function getMemory(id: number): Promise<AiMemory | null> {
  const [row] = await db.select().from(aiMemories).where(eq(aiMemories.id, id)).limit(1);
  return row ?? null;
}

export async function changeMemory(
  user: User | null,
  id: number,
  patch: { text?: string; category?: MemoryCategory; status?: "active" | "rejected" },
): Promise<{ ok: true } | { ok: false; error: "not_found" | "forbidden" | "empty" | "too_long" }> {
  const m = await getMemory(id);
  if (!m) return { ok: false, error: "not_found" };
  if (!(await mayChangeMemory(user, m))) return { ok: false, error: "forbidden" };
  const set: Partial<AiMemory> = { updatedAt: new Date() };
  if (patch.text !== undefined) {
    const text = patch.text.replace(/\s+/g, " ").trim();
    if (!text) return { ok: false, error: "empty" };
    if (text.length > MEMORY_MAX_CHARS) return { ok: false, error: "too_long" };
    if (text !== m.text) {
      set.text = text;
      set.edited = true;
    }
  }
  if (patch.category) set.category = patch.category;
  if (patch.status) set.status = patch.status;
  await db.update(aiMemories).set(set).where(eq(aiMemories.id, id));
  return { ok: true };
}

export async function removeMemory(user: User | null, id: number): Promise<{ ok: true } | { ok: false; error: "not_found" | "forbidden" }> {
  const m = await getMemory(id);
  if (!m) return { ok: false, error: "not_found" };
  if (!(await mayChangeMemory(user, m))) return { ok: false, error: "forbidden" };
  await db.delete(aiMemories).where(eq(aiMemories.id, id));
  return { ok: true };
}

/** "Tout effacer": this person's own memories. Team and client ones stay. */
export async function clearMyMemories(user: User | null): Promise<number> {
  const r = await db
    .delete(aiMemories)
    .where(and(eq(aiMemories.scope, "user"), user ? eq(aiMemories.userId, user.id) : isNull(aiMemories.userId)))
    .returning({ id: aiMemories.id });
  return r.length;
}

function block(title: string, rows: AiMemory[]): string {
  if (rows.length === 0) return "";
  const lines: string[] = [];
  let used = 0;
  for (const m of rows) {
    const line = `- [#${m.id}, ${m.category}] ${m.text}`;
    if (used + line.length > MEMORY_PROMPT_BUDGET) break;
    lines.push(line);
    used += line.length + 1;
  }
  return `${title}\n${lines.join("\n")}`;
}

/**
 * What the model is told it remembers, at the top of the conversation:
 * the agency's charter, then the person's, the team's and the current
 * client's active memories, each within its budget.
 */
export async function memoryPrompt(user: User | null, clientId: number | null): Promise<string> {
  const parts: string[] = [];
  const charter = (await getSetting<string>("ai.charter"))?.trim();
  if (charter) parts.push(`Agency charter (always follow):\n${charter.slice(0, MEMORY_PROMPT_BUDGET)}`);

  const active = (scope: MemoryScope, extra?: ReturnType<typeof eq>) =>
    db
      .select()
      .from(aiMemories)
      .where(and(eq(aiMemories.scope, scope), eq(aiMemories.status, "active"), extra))
      .orderBy(desc(aiMemories.updatedAt))
      .limit(60);

  if (await memoryEnabledFor(user)) {
    const mine = await active("user", user ? eq(aiMemories.userId, user.id) : isNull(aiMemories.userId));
    const b = block("What you remember about the person you are talking to:", mine);
    if (b) parts.push(b);
  }
  const team = block("What the team asked you to remember:", await active("team"));
  if (team) parts.push(team);
  if (clientId && (await canSeeClient(user, clientId))) {
    const [c] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, clientId)).limit(1);
    const b = block(`What the team remembers about ${c?.name ?? `client #${clientId}`}:`, await active("client", eq(aiMemories.clientId, clientId)));
    if (b) parts.push(b);
  }
  return parts.join("\n\n");
}
