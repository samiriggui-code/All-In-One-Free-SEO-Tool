/**
 * Text out of a file a person adds to the knowledge base: PDF (unpdf),
 * Word .docx (mammoth, through HTML so headings survive as Markdown
 * headings and the chunker can cut on them), and plain text / Markdown.
 *
 * Old binary .doc, scanned PDFs without a text layer and anything else
 * are refused with a reason the page can show.
 */

import { parseHtmlToMarkdown } from "@/lib/main-content-extractor";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export type FileKind = "pdf" | "docx" | "text";

export type Extracted =
  | { ok: true; kind: FileKind; title: string; text: string }
  | { ok: false; reason: "too_big" | "unsupported" | "empty" | "unreadable" };

export function fileKind(name: string, type: string): FileKind | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || type === "application/pdf") return "pdf";
  if (ext === "docx" || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (["txt", "md", "markdown", "csv"].includes(ext) || /^text\//.test(type)) return "text";
  return null;
}

function hasMagic(bytes: Uint8Array, kind: FileKind): boolean {
  if (kind === "pdf") return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  if (kind === "docx") return bytes[0] === 0x50 && bytes[1] === 0x4b; // PK (zip)
  return true;
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || name;

export async function extractFile(name: string, type: string, bytes: Uint8Array): Promise<Extracted> {
  if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, reason: "too_big" };
  const kind = fileKind(name, type);
  if (!kind || !hasMagic(bytes, kind)) return { ok: false, reason: "unsupported" };

  try {
    let text = "";
    let title = baseName(name);
    if (kind === "pdf") {
      const { extractText, getDocumentProxy, getMeta } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const meta = await getMeta(pdf).catch(() => null);
      const metaTitle = (meta?.info as { Title?: string } | undefined)?.Title?.trim();
      if (metaTitle) title = metaTitle;
      const { text: pages } = await extractText(pdf, { mergePages: false });
      // One "section" per page so search can say where a passage is.
      text = (pages as string[])
        .map((p, i) => (p.trim() ? `## Page ${i + 1}\n\n${p.replace(/[ \t]+\n/g, "\n").trim()}` : ""))
        .filter(Boolean)
        .join("\n\n");
    } else if (kind === "docx") {
      const mammoth = await import("mammoth");
      const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
      text = parseHtmlToMarkdown(`<html><body>${html}</body></html>`).markdown;
    } else {
      text = new TextDecoder("utf-8").decode(bytes);
    }
    text = text.replace(/\u0000/g, "").trim();
    if (!text) return { ok: false, reason: "empty" };
    return { ok: true, kind, title: title.slice(0, 200), text };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}
