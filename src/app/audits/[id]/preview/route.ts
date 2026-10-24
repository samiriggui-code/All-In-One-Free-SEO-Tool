import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { audits } from "@/db/schema";
import { dataDir } from "@/lib/data-dir";
import { AccessDeniedError, requireClientAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const auditId = Number(id);
  if (!Number.isFinite(auditId)) {
    return new NextResponse("Bad id", { status: 400 });
  }

  const [row] = await db
    .select({ previewScreenshotPath: audits.previewScreenshotPath, clientId: audits.clientId })
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1);

  if (!row?.previewScreenshotPath) {
    return new NextResponse("Not found", { status: 404 });
  }
  // The screenshot shows a client's site: only users who may see that
  // client get it.
  try {
    await requireClientAccess(row.clientId);
  } catch (err) {
    // Same answer as a missing preview, so it doesn't reveal which audits have one.
    if (err instanceof AccessDeniedError) return new NextResponse("Not found", { status: 404 });
    throw err;
  }

  const root = path.resolve(dataDir());
  const abs = path.resolve(root, row.previewScreenshotPath);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(abs);
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }

  // @ts-expect-error - Buffer is valid BodyInit at runtime
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // Access is checked per request, so no cache may replay the image
      // to a user who has since lost access to the client.
      "Cache-Control": "no-store",
    },
  });
}
