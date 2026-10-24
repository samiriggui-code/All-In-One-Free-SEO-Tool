"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import {
  clearUnpinnedConversations,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  toggleConversationPin,
  type ChatKind,
} from "@/lib/chat-store";
import type { ChatConversation, ChatMessage } from "@/db/schema";

export async function fetchChats(opts: {
  kind?: ChatKind;
  clientId?: number | null;
  limit?: number;
}): Promise<ChatConversation[]> {
  await requireSignedIn();
  return listConversations(opts);
}

export async function fetchChat(
  id: number,
): Promise<{ conversation: ChatConversation; messages: ChatMessage[] } | null> {
  await requireSignedIn();
  return getConversation(id);
}

export async function deleteChat(id: number) {
  await requireSignedIn();
  await deleteConversation(id);
  revalidatePath("/chats");
  revalidatePath("/seo-chat");
  revalidatePath("/ask");
}

export async function pinChat(id: number) {
  await requireSignedIn();
  await toggleConversationPin(id);
  revalidatePath("/chats");
}

export async function renameChat(id: number, formData: FormData) {
  await requireSignedIn();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await renameConversation(id, title);
  revalidatePath("/chats");
}

export async function clearChats(kind?: ChatKind) {
  await requireSignedIn();
  const n = await clearUnpinnedConversations({ kind });
  revalidatePath("/chats");
  return n;
}
