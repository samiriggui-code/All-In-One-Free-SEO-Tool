import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { reportArchives } from "@/db/schema";
import { notFound, pdfResponse, portalClient } from "../../../portal-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A report the agency approved or sent, as the PDF it archived. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  const client = await portalClient(token);
  if (!client || !/^\d+$/.test(id)) return notFound();

  const [report] = await db
    .select({ title: reportArchives.title, pdf: reportArchives.pdfBase64 })
    .from(reportArchives)
    .where(
      and(
        eq(reportArchives.id, Number(id)),
        eq(reportArchives.clientId, client.id),
        inArray(reportArchives.status, ["approved", "sent"]),
        isNotNull(reportArchives.pdfBase64),
      ),
    )
    .limit(1);
  if (!report?.pdf) return notFound();

  const name = report.title.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "report";
  return pdfResponse(Buffer.from(report.pdf, "base64"), `${name}.pdf`);
}
