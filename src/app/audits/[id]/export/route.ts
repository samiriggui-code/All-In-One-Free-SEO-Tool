import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { audits } from "@/db/schema";
import { renderLlmReport, renderMarkdownReport, type AuditResult } from "@/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id: idParam } = await params;
  const auditId = Number(idParam);
  if (!Number.isFinite(auditId)) notFound();

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "markdown";
  if (format !== "markdown" && format !== "llm") {
    return new Response("format must be markdown or llm", { status: 400 });
  }

  const [row] = await db
    .select({ rawReport: audits.rawReport })
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1);

  // The engine's full result, stored with the audit. Audits from before the
  // engine ran (and failed ones) have none, so there is nothing to export.
  const raw = row?.rawReport as AuditResult | null | undefined;
  if (!raw || !Array.isArray(raw.categoryResults)) notFound();

  const body = format === "llm" ? renderLlmReport(raw) : renderMarkdownReport(raw);

  const ext = format === "llm" ? "llm.txt" : "md";
  const filename = `audit-${auditId}.${ext}`;

  return new Response(body, {
    headers: {
      "Content-Type": format === "llm" ? "text/plain; charset=utf-8" : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
