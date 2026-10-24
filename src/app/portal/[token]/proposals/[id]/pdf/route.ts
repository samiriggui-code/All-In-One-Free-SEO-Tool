import { and, eq, inArray } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/db/client";
import { proposals } from "@/db/schema";
import { proposalPdfFromRow, proposalPdfName } from "@/lib/proposal-pdf";
import { notFound, pdfResponse, portalClient } from "../../../portal-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The client's quote as a PDF. Drafts stay private. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  const client = await portalClient(token);
  if (!client || !/^\d+$/.test(id)) return notFound();

  const [row] = await db
    .select()
    .from(proposals)
    .where(
      and(
        eq(proposals.id, Number(id)),
        eq(proposals.clientId, client.id),
        inArray(proposals.status, ["sent", "accepted"]),
      ),
    )
    .limit(1);
  if (!row) return notFound();

  return pdfResponse(await proposalPdfFromRow(row, await getLocale()), proposalPdfName(row.prospectName));
}
