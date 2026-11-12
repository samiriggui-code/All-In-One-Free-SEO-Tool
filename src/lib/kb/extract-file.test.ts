import { describe, expect, it } from "vitest";
import { extractFile, fileKind, MAX_FILE_BYTES } from "./extract-file";

const enc = (s: string) => new TextEncoder().encode(s);

describe("extractFile", () => {
  it("recognises the supported kinds", () => {
    expect(fileKind("Brochure.PDF", "")).toBe("pdf");
    expect(fileKind("charte.docx", "")).toBe("docx");
    expect(fileKind("notes.md", "")).toBe("text");
    expect(fileKind("ancien.doc", "application/msword")).toBeNull();
  });

  it("reads text and Markdown, titled from the file name", async () => {
    const r = await extractFile("charte_editoriale.md", "text/markdown", enc("# Ton\n\nOn vouvoie."));
    expect(r).toEqual({ ok: true, kind: "text", title: "charte editoriale", text: "# Ton\n\nOn vouvoie." });
  });

  it("refuses a file whose bytes do not match its extension", async () => {
    expect(await extractFile("faux.pdf", "application/pdf", enc("pas un pdf"))).toEqual({ ok: false, reason: "unsupported" });
    expect(await extractFile("faux.docx", "", enc("pas un zip"))).toEqual({ ok: false, reason: "unsupported" });
  });

  it("refuses empty and oversized files", async () => {
    expect(await extractFile("vide.txt", "text/plain", enc("   "))).toEqual({ ok: false, reason: "empty" });
    expect(await extractFile("gros.txt", "text/plain", new Uint8Array(MAX_FILE_BYTES + 1))).toEqual({ ok: false, reason: "too_big" });
  });

  it("reports a broken PDF as unreadable", async () => {
    expect(await extractFile("casse.pdf", "application/pdf", enc("%PDF-1.7 garbage"))).toEqual({ ok: false, reason: "unreadable" });
  });
});
