"use server";

import { revalidatePath } from "next/cache";
import { actionTx } from "@/lib/action-tx";
import { requireSignedIn } from "@/lib/action-guard";
import { currentUser, requireEditor } from "@/lib/auth";
import { deleteSetting, setSetting } from "@/lib/settings-store";
import {
  addMemory,
  changeMemory,
  clearMyMemories,
  listVisibleMemories,
  removeMemory,
  type MemoryCategory,
  type MemoryScope,
} from "@/lib/assistant/memory";

/**
 * Ma mémoire: every check (whose memory, edit rights on the client) is in
 * lib/assistant/memory.ts, against the signed-in person read from the
 * session, never from the form.
 */

export type MemoryResult = { ok: true } | { ok: false; error: string };

const PAGE = "/settings/memory";

async function fail(code: string): Promise<MemoryResult> {
  const tx = await actionTx("settingsMemory");
  return { ok: false, error: tx.has(`errors.${code}`) ? tx(`errors.${code}`) : code };
}

export async function addMemoryAction(input: {
  scope: MemoryScope;
  text: string;
  category: MemoryCategory;
  clientId?: number | null;
}): Promise<MemoryResult> {
  await requireEditor();
  await requireSignedIn();
  const r = await addMemory(await currentUser(), { ...input, source: "manual" });
  if (!r.ok) return fail(r.error);
  revalidatePath(PAGE);
  return { ok: true };
}

export async function updateMemoryAction(
  id: number,
  patch: { text?: string; category?: MemoryCategory; status?: "active" | "rejected" },
): Promise<MemoryResult> {
  await requireEditor();
  await requireSignedIn();
  const r = await changeMemory(await currentUser(), Number(id), patch);
  if (!r.ok) return fail(r.error);
  revalidatePath(PAGE);
  return { ok: true };
}

export async function deleteMemoryAction(id: number): Promise<MemoryResult> {
  await requireEditor();
  await requireSignedIn();
  const r = await removeMemory(await currentUser(), Number(id));
  if (!r.ok) return fail(r.error);
  revalidatePath(PAGE);
  return { ok: true };
}

export async function clearMyMemoriesAction(): Promise<MemoryResult> {
  await requireEditor();
  await requireSignedIn();
  await clearMyMemories(await currentUser());
  revalidatePath(PAGE);
  return { ok: true };
}

export async function setMemoryEnabledAction(on: boolean): Promise<MemoryResult> {
  await requireEditor();
  await requireSignedIn();
  const me = await currentUser();
  if (!me) return fail("noAccount");
  if (on) await deleteSetting(`memory.user_off.${me.id}`);
  else await setSetting(`memory.user_off.${me.id}`, true);
  revalidatePath(PAGE);
  return { ok: true };
}

/** Everything this person can see, as JSON, for "Exporter". */
export async function exportMemoriesAction(): Promise<string> {
  await requireEditor();
  await requireSignedIn();
  const rows = await listVisibleMemories(await currentUser());
  return JSON.stringify(
    rows.map((m) => ({
      id: m.id,
      scope: m.scope,
      clientId: m.clientId,
      text: m.text,
      category: m.category,
      status: m.status,
      source: m.source,
      edited: m.edited,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    null,
    2,
  );
}
