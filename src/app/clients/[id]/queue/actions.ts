"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { publishQueue } from "@/db/schema";

async function ownItem(itemId: number, clientId: number) {
  const [row] = await db
    .select()
    .from(publishQueue)
    .where(
      and(
        eq(publishQueue.id, itemId),
        eq(publishQueue.clientId, clientId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function approveQueueItem(
  itemId: number,
  clientId: number,
  edits?: { title?: string; body?: string },
): Promise<{ ok: boolean; message: string }> {
  await requireSignedIn();
  const tx = await getTranslations("ui.app_clients_id_queue_actions");
  const item = await ownItem(itemId, clientId);
  if (!item) return { ok: false, message: tx("queueItemNotFound") };
  if (item.status !== "pending_review") {
    return { ok: false, message: `Already ${item.status.replace("_", " ")}.` };
  }
  await db
    .update(publishQueue)
    .set({
      status: "approved",
      title: edits?.title ?? item.title,
      body: edits?.body ?? item.body,
      updatedAt: new Date(),
    })
    .where(eq(publishQueue.id, itemId));
  revalidatePath(`/clients/${clientId}/queue`);
  return {
    ok: true,
    message: tx("approvedPublishesOnTheNext"),
  };
}

/**
 * Approve + publish immediately. Best path for the user who wants to
 * see the end-to-end loop working today rather than waiting for the
 * next tick.
 */
export async function approveAndPublishNow(
  itemId: number,
  clientId: number,
  edits?: { title?: string; body?: string },
): Promise<{ ok: boolean; message: string }> {
  await requireSignedIn();
  const tx = await getTranslations("ui.app_clients_id_queue_actions");
  const item = await ownItem(itemId, clientId);
  if (!item) return { ok: false, message: tx("queueItemNotFound") };
  if (item.status === "published") {
    return { ok: false, message: tx("alreadyPublished") };
  }
  await db
    .update(publishQueue)
    .set({
      status: "approved",
      title: edits?.title ?? item.title,
      body: edits?.body ?? item.body,
      updatedAt: new Date(),
    })
    .where(eq(publishQueue.id, itemId));
  const { tickQueuePublish } = await import("@/lib/daily-automations");
  const r = await tickQueuePublish();
  revalidatePath(`/clients/${clientId}/queue`);
  if (r.published > 0) return { ok: true, message: tx("published") };
  if (r.failed > 0) {
    // Re-read to surface the error message
    const [post] = await db
      .select()
      .from(publishQueue)
      .where(eq(publishQueue.id, itemId))
      .limit(1);
    return {
      ok: false,
      message: `Publish failed: ${post?.errorMsg ?? "unknown error"}`,
    };
  }
  return {
    ok: true,
    message:
      tx("approvedButNotPickedUp"),
  };
}

export async function rejectQueueItem(
  itemId: number,
  clientId: number,
  note?: string,
): Promise<void> {
  await requireSignedIn();
  await db
    .update(publishQueue)
    .set({
      status: "skipped",
      reviewNote: note?.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publishQueue.id, itemId),
        eq(publishQueue.clientId, clientId),
      ),
    );
  revalidatePath(`/clients/${clientId}/queue`);
}

export async function deleteQueueItem(
  itemId: number,
  clientId: number,
): Promise<void> {
  await requireSignedIn();
  await db
    .delete(publishQueue)
    .where(
      and(
        eq(publishQueue.id, itemId),
        eq(publishQueue.clientId, clientId),
      ),
    );
  revalidatePath(`/clients/${clientId}/queue`);
}
