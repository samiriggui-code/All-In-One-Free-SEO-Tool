import type { ExportPost } from "./common";

function tomlEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * The JSON-LD as one TOML string. Hugo's default Markdown renderer drops
 * raw HTML, so a <script> in the body (what BlogPilot emitted) never
 * reached the page. Front matter survives; the site's template prints it
 * with `{{ with .Params.schema }}<script type="application/ld+json">{{ . | safeJS }}</script>{{ end }}`.
 */
function schemaParam(jsonLd: string): string {
  let compact = jsonLd.replace(/\s*\n\s*/g, " ");
  try {
    compact = JSON.stringify(JSON.parse(jsonLd));
  } catch {
    // Not valid JSON: keep it as typed, on one line.
  }
  return tomlEscape(compact);
}

export const HUGO_SCHEMA_SNIPPET =
  '{{ with .Params.schema }}<script type="application/ld+json">{{ . | safeJS }}</script>{{ end }}';

export function buildHugoMarkdown(p: ExportPost): string {
  const date = p.publishDateISO ?? new Date().toISOString();
  const keywords = p.primaryKeyword ? `["${tomlEscape(p.primaryKeyword)}"]` : "[]";
  const schema = p.schemaJsonLd.trim() ? `\nschema = "${schemaParam(p.schemaJsonLd)}"` : "";
  return `+++
title = "${tomlEscape(p.title)}"
date = ${date}
draft = true
slug = "${tomlEscape(p.slug)}"
description = "${tomlEscape(p.metaDescription)}"
keywords = ${keywords}${schema}
[seo]
title = "${tomlEscape(p.metaTitle)}"
description = "${tomlEscape(p.metaDescription)}"
+++

${p.draftMarkdown}
`;
}
