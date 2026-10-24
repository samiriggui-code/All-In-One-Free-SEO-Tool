import type { Outline } from "./types";

/**
 * The outline as plain text the user can edit in one textarea.
 *
 * A form with a row per heading is what BlogPilot had; a textarea is
 * faster to reorder, delete and rename in, and the shape it needs to
 * hold is only two levels deep: "## " starts a section, "### " a
 * sub-heading under it. FAQ questions live under a "## FAQ" marker line
 * as "? " lines so they survive the round trip.
 */
const FAQ_MARKER = "## FAQ";

export function outlineToText(outline: Outline): string {
  const lines: string[] = [];
  for (const h2 of outline.h2s ?? []) {
    if (!h2?.heading) continue;
    lines.push(`## ${h2.heading}`);
    for (const h3 of h2.h3s ?? []) if (h3) lines.push(`### ${h3}`);
  }
  const faqs = (outline.faqs ?? []).filter((f) => f?.q);
  if (faqs.length > 0) {
    lines.push(FAQ_MARKER);
    for (const f of faqs) lines.push(`? ${f.q}`);
  }
  return lines.join("\n");
}

/**
 * Apply edited text back onto an outline. Everything the textarea does
 * not show (intro hook, TL;DR, image ideas...) is kept from `base`; a
 * section that kept its heading keeps its notes too, and an unchanged
 * question keeps its target length.
 */
export function textToOutline(text: string, base: Outline): Outline {
  const byHeading = new Map((base.h2s ?? []).map((h) => [h.heading, h]));
  const byQuestion = new Map((base.faqs ?? []).map((f) => [f.q, f]));
  const h2s: Outline["h2s"] = [];
  const faqs: Outline["faqs"] = [];
  let inFaq = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.toLowerCase() === FAQ_MARKER.toLowerCase()) {
      inFaq = true;
      continue;
    }
    if (inFaq && line.startsWith("?")) {
      const q = line.replace(/^\?\s*/, "");
      if (q) faqs.push({ ...(byQuestion.get(q) ?? {}), q });
      continue;
    }
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      if (h2s.length === 0) h2s.push({ heading: h3[1], h3s: [] });
      else h2s[h2s.length - 1].h3s.push(h3[1]);
      continue;
    }
    // "## Heading", or a bare line, starts a section.
    const heading = line.replace(/^#{1,2}\s+/, "");
    inFaq = false;
    const prev = byHeading.get(heading);
    h2s.push({ ...(prev ?? {}), heading, h3s: [] });
  }

  return { ...base, h2s, faqs };
}
