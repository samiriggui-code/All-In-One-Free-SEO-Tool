"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";
import { requireClientAccess } from "@/lib/auth";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { logActivity } from "@/lib/activity";

export async function disconnectPerClientGoogle(
  clientId: number,
): Promise<void> {
  await requireSignedIn();
  const tx = await getTranslations("ui.app_clients_id_per-client-google-actions");
  if (!Number.isFinite(clientId) || clientId <= 0) return;
  await requireClientAccess(clientId, { edit: true });
  await db
    .update(clients)
    .set({
      googleRefreshToken: null,
      googleAccessToken: null,
      googleAccessTokenExpiresAt: null,
      googleConnectedEmail: null,
    })
    .where(eq(clients.id, clientId));

  await logActivity({
    kind: "google.disconnected",
    message: tx("disconnectedPerClientGoogleAccount"),
    level: "info",
    clientId,
  });
  revalidatePath(`/clients/${clientId}`);
}
