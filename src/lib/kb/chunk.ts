/**
 * Cut a document into passages for search.
 *
 * Passages follow the structure of the text: a Markdown heading starts a
 * new section, and each section is cut on paragraph boundaries into
 * passages of about TARGET characters. A paragraph longer than MAX is cut
 * on sentence boundaries. Each passage remembers the heading it sits
 * under, which search shows and also matches on.
 *
 * Pure: no database, no network.
 */

export const TARGET_CHARS = 900;
export const MAX_CHARS = 1400;

export type Chunk = { ordinal: number; heading: string | null; text: string };

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

function splitLong(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHARS) return [paragraph];
  const sentences = paragraph.match(/[^.!?…]+(?:[.!?…]+["»”)]?\s*|$)/g) ?? [paragraph];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && cur.length + s.length > TARGET_CHARS) {
      out.push(cur.trim());
      cur = "";
    }
    if (s.length > MAX_CHARS) {
      // A "sentence" with no full stop (a list pasted as one line): hard cut.
      for (let i = 0; i < s.length; i += TARGET_CHARS) out.push(s.slice(i, i + TARGET_CHARS).trim());
      continue;
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

export function chunkText(input: string): Chunk[] {
  const text = String(input ?? "").replace(/\r\n?/g, "\n").trim();
  if (!text) return [];

  // Sections: [heading, paragraphs[]]
  const sections: { heading: string | null; paragraphs: string[] }[] = [{ heading: null, paragraphs: [] }];
  let para: string[] = [];
  const flush = () => {
    const p = para.join("\n").trim();
    if (p) sections[sections.length - 1].paragraphs.push(p);
    para = [];
  };
  for (const line of text.split("\n")) {
    const h = line.match(HEADING);
    if (h) {
      flush();
      sections.push({ heading: h[2].trim(), paragraphs: [] });
    } else if (!line.trim()) {
      flush();
    } else {
      para.push(line);
    }
  }
  flush();

  const chunks: Chunk[] = [];
  for (const section of sections) {
    let cur = "";
    const push = () => {
      if (cur.trim()) chunks.push({ ordinal: chunks.length, heading: section.heading, text: cur.trim() });
      cur = "";
    };
    for (const p of section.paragraphs.flatMap(splitLong)) {
      if (cur && cur.length + p.length + 2 > TARGET_CHARS) push();
      cur += (cur ? "\n\n" : "") + p;
    }
    push();
  }
  return chunks;
}
