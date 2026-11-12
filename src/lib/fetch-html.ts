/**
 * Plain HTTP fetch of one HTML page, shared by the tools that read a
 * page's text: the content grader and the refresh detector (studio
 * family), the internal-link graph and the PageRank simulation
 * (internal links family). They each carried the same copy of this.
 *
 * Returns null on any failure (network, timeout, non-2xx answer, not
 * HTML), so callers can skip the page and carry on.
 */

export const BOT_USER_AGENT =
  "Mozilla/5.0 (compatible; SeoToolBot/1.0; +https://example.com/bot)";

export async function fetchHtml(
  url: string,
  opts: { timeoutMs?: number; maxChars?: number } = {},
): Promise<string | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), opts.timeoutMs ?? 12_000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": BOT_USER_AGENT, accept: "text/html" },
      signal: ac.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html/i.test(ct)) return null;
    return (await res.text()).slice(0, opts.maxChars ?? 800_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** The few entities the text extractors decode. */
export function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/**
 * The page's <body> (or the whole document when it has none) with the
 * listed elements removed, contents included. Tags are kept otherwise.
 */
export function bodyWithout(html: string, tags: readonly string[]): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : html;
  for (const tag of tags) {
    body = body.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }
  return body;
}

/** H2 and H3 texts, 3 to 120 characters long. */
export function subHeadings(html: string): string[] {
  const headings: string[] = [];
  for (const m of html.matchAll(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi)) {
    const txt = decodeBasicEntities(m[1].replace(/<[^>]+>/g, " ")).trim();
    if (txt.length >= 3 && txt.length <= 120) headings.push(txt);
  }
  return headings;
}

/** Visible text: tags dropped, entities decoded, whitespace collapsed. */
export function textOf(html: string): string {
  return decodeBasicEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
