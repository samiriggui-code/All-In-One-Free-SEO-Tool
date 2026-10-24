import { and, eq, inArray } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/db/client";
import { invoices } from "@/db/schema";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { notFound, pdfResponse, portalClient } from "../../../portal-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** One of the client's invoices. Drafts and void ones are not theirs to see. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  const client = await portalClient(token);
  if (!client || !/^\d+$/.test(id)) return notFound();

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, Number(id)),
        eq(invoices.clientId, client.id),
        inArray(invoices.status, ["sent", "paid", "overdue"]),
      ),
    )
    .limit(1);
  if (!invoice) return notFound();

  const pdf = await generateInvoicePdf(invoice, client, await getLocale());
  return pdfResponse(pdf, `${invoice.invoiceNumber.replace(/[^a-z0-9-]+/gi, "-")}.pdf`);
}
