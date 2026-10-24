import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, invoices } from "@/db/schema";
import { guardAdminRequest } from "@/lib/admin-auth";
import { getLocale } from "next-intl/server";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  // Without this guard, any local process on the user's machine can
  // enumerate /invoices/1/pdf -> /invoices/N/pdf and exfiltrate every
  // invoice (client names, amounts, payment terms — financial data).
  // The middleware only auth-gates when APP_PASSWORD is set; we need
  // an explicit guard for the single-user-no-password default flow too.
  const denied = guardAdminRequest(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  const invoiceId = Number(id);
  if (!Number.isFinite(invoiceId)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .limit(1);

  const locale = await getLocale();
  const pdf = await generateInvoicePdf(invoice, client, locale);

  const filename = `${invoice.invoiceNumber.replace(/[^a-z0-9-]+/gi, "-")}.pdf`;

  // @ts-expect-error - Buffer is valid BodyInit at runtime
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
