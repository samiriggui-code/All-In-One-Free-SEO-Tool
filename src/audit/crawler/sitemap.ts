import { gunzipSync } from "zlib";
import { getUserAgent } from "@/audit/crawler/user-agent";
import { rethrowIfAborted, throwIfAborted } from "@/audit/engine/errors";
import { auditFetch } from "@/audit/crawler/net";
import type { SitemapDocument, SitemapEntry, SitemapFetchResult } from "@/audit/types";

export const MAX_CHILD_SITEMAPS = 10;
export const MAX_URLS2 = 5e4;
export const FETCH_TIMEOUT_MS = 1e4;
export function isGzip(bytes: Uint8Array) {
  return bytes.length > 2 && bytes[0] === 31 && bytes[1] === 139;
}
export async function fetchSitemapDocument(url: string, signal?: AbortSignal): Promise<string | null> {
  throwIfAborted(signal);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await auditFetch(url, {
      signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
      headers: { "User-Agent": getUserAgent() }
    });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (isGzip(bytes)) {
      try {
        return gunzipSync(bytes).toString("utf8");
      } catch {
        return null;
      }
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch (error) {
    rethrowIfAborted(error, signal);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
export function tagText(fragment: string, tag: string) {
  const match = fragment.match(new RegExp(`<${tag}[^>]*>\\s*([\\s\\S]*?)\\s*</${tag}>`, "i"));
  return match ? decodeXml(match[1].trim()) : void 0;
}
export function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))).replace(/&amp;/g, "&");
}
export function isSitemapIndex3(xml: string) {
  return /<sitemapindex[\s>]/i.test(xml);
}
export function parseSitemapEntries(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const urlBlocks = xml.match(/<url[\s>][\s\S]*?<\/url>/gi) ?? [];
  for (const block of urlBlocks) {
    const loc = tagText(block, "loc");
    if (!loc) continue;
    const entry: SitemapEntry = { loc };
    const lastmod = tagText(block, "lastmod");
    if (lastmod) entry.lastmod = lastmod;
    const changefreq = tagText(block, "changefreq");
    if (changefreq) entry.changefreq = changefreq;
    const priority = tagText(block, "priority");
    if (priority !== void 0) {
      const parsed = Number.parseFloat(priority);
      if (!Number.isNaN(parsed)) entry.priority = parsed;
    }
    entries.push(entry);
  }
  if (entries.length === 0) {
    const locRegex = /<loc[^>]*>\s*([\s\S]*?)\s*<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      entries.push({ loc: decodeXml(match[1].trim()) });
    }
  }
  return entries;
}
export function parseSitemapIndex(xml: string): string[] {
  const children: string[] = [];
  const blocks = xml.match(/<sitemap[\s>][\s\S]*?<\/sitemap>/gi) ?? [];
  for (const block of blocks) {
    const loc = tagText(block, "loc");
    if (loc) children.push(loc);
  }
  return children;
}
export function parseSitemapDeclarations(robotsTxtContent: string): string[] {
  const declarations: string[] = [];
  const regex = /^\s*Sitemap:\s*(\S+)\s*$/gim;
  let match;
  while ((match = regex.exec(robotsTxtContent)) !== null) {
    declarations.push(match[1].trim());
  }
  return declarations;
}
export async function fetchSitemap(siteUrl: string | URL, robotsTxtContent?: string, signal?: AbortSignal): Promise<SitemapFetchResult> {
  const empty2: SitemapFetchResult = {
    urls: [],
    entries: [],
    sources: [],
    isIndex: false,
    skippedSitemaps: 0,
    documents: []
  };
  let origin: string;
  try {
    const parsed = new URL(siteUrl);
    origin = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return empty2;
  }
  const declared = robotsTxtContent ? parseSitemapDeclarations(robotsTxtContent) : [];
  const startingPoints = declared.length > 0 ? declared : [`${origin}/sitemap.xml`];
  const entries: SitemapEntry[] = [];
  const sources: string[] = [];
  const documents: SitemapDocument[] = [];
  const sourceByLoc = new Map<string, string[]>();
  const seen = new Set<string>();
  let rootContent: string | undefined;
  let sawIndex = false;
  let skippedSitemaps = 0;
  let childBudget = MAX_CHILD_SITEMAPS;
  const collectEntries = (documentUrl: string, xml: string) => {
    const parsed = parseSitemapEntries(xml);
    documents.push({
      url: documentUrl,
      urlCount: parsed.length,
      bytes: Buffer.byteLength(xml, "utf8"),
      isIndex: false
    });
    for (const entry of parsed) {
      entries.push(entry);
      const known = sourceByLoc.get(entry.loc);
      if (known) {
        if (!known.includes(documentUrl)) known.push(documentUrl);
      } else {
        sourceByLoc.set(entry.loc, [documentUrl]);
      }
    }
  };
  for (const start of startingPoints) {
    if (seen.has(start)) continue;
    seen.add(start);
    const xml = await fetchSitemapDocument(start, signal);
    if (xml === null) continue;
    sources.push(start);
    if (rootContent === void 0) rootContent = xml;
    if (isSitemapIndex3(xml)) {
      sawIndex = true;
      documents.push({ url: start, urlCount: 0, bytes: Buffer.byteLength(xml, "utf8"), isIndex: true });
      const children = parseSitemapIndex(xml);
      for (const child of children) {
        if (childBudget <= 0 || entries.length >= MAX_URLS2) {
          skippedSitemaps++;
          continue;
        }
        if (seen.has(child)) continue;
        seen.add(child);
        childBudget--;
        const childXml = await fetchSitemapDocument(child, signal);
        if (childXml === null) continue;
        sources.push(child);
        collectEntries(child, childXml);
      }
    } else {
      collectEntries(start, xml);
    }
    if (entries.length >= MAX_URLS2) break;
  }
  const capped = entries.slice(0, MAX_URLS2);
  const urlSources = new Map<string, string[]>();
  for (const entry of capped) {
    urlSources.set(entry.loc, sourceByLoc.get(entry.loc) ?? []);
  }
  return {
    ...rootContent !== void 0 && { content: rootContent },
    urls: capped.map((entry) => entry.loc),
    entries: capped,
    sources,
    isIndex: sawIndex,
    skippedSitemaps,
    documents,
    // Omitted when nothing was fetched, so "unknown" stays distinguishable
    // from "fetched, and no URL is listed twice".
    ...sources.length > 0 && { urlSources }
  };
}
