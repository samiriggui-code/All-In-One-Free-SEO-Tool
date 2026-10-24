import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, type Client } from "@/db/schema";

/**
 * The client a portal link belongs to, or null.
 *
 * The share token is the only credential the portal has, so every page,
 * action and download under /portal/[token] starts here and then only
 * reads rows that belong to this client.
 */
export async function portalClient(token: string | undefined): Promise<Client | null> {
  if (!token || token.length < 16) return null;
  const [client] = await db.select().from(clients).where(eq(clients.shareToken, token)).limit(1);
  return client ?? null;
}

/** The same 404 for a bad link and for someone else's document. */
export function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

/** A PDF response the portal serves inline, never cached. */
export function pdfResponse(pdf: Buffer, filename: string): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
