import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { guardClientRequest } from "@/lib/admin-auth";
import { currentUser } from "@/lib/auth";
import { extractFile, MAX_FILE_BYTES } from "@/lib/kb/extract-file";
import { upsertDocument } from "@/lib/kb/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Add a file (PDF, Word .docx, text) to a client's knowledge base. A route
 * rather than a server action: server actions cap request bodies at 1 MB
 * and a brochure PDF is often more. Same rights as the page's other
 * writes: access to this client, with edit rights.
 *
 * The same file added twice replaces itself (keyed by a hash of its bytes).
 */
export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = Number((await params).clientId);
  if (!Number.isInteger(clientId)) return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  const denied = await guardClientRequest(req, clientId, { edit: true });
  if (denied) return denied;
  const t = await getTranslations("knowledge.errors");

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_FILE_BYTES + 64 * 1024) {
    return Response.json({ ok: false, error: t("fileTooBig", { mb: MAX_FILE_BYTES / 1024 / 1024 }) }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return Response.json({ ok: false, error: t("fileUnreadable") }, { status: 400 });
  }
  if (!(file instanceof File)) return Response.json({ ok: false, error: t("fileUnreadable") }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const r = await extractFile(file.name, file.type, bytes);
  if (!r.ok) {
    const key = { too_big: "fileTooBig", unsupported: "fileUnsupported", empty: "fileEmpty", unreadable: "fileUnreadable" }[r.reason];
    return Response.json({ ok: false, error: t(key, { mb: MAX_FILE_BYTES / 1024 / 1024 }) }, { status: 400 });
  }

  const me = await currentUser();
  const sourceId = createHash("sha256").update(bytes).digest("hex").slice(0, 32);
  const doc = await upsertDocument({
    clientId,
    sourceType: "file",
    sourceId,
    title: r.title,
    text: r.text,
    manual: true,
    createdBy: me?.id ?? null,
  });
  revalidatePath(`/knowledge/c/${clientId}`);
  return Response.json({ ok: true, documentId: doc.documentId, passages: doc.chunks });
}
