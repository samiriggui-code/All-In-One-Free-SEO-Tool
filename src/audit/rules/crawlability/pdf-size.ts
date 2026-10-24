import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { getUserAgent } from "@/audit/crawler/user-agent";
import { registerResettable } from "@/audit/engine/rule-registry";
import { auditFetch } from "@/audit/crawler/net";

export const WARN_BYTES = 10 * 1024 * 1024;
export const SAMPLE_LIMIT7 = 8;
export const lengths = /* @__PURE__ */ new Map();
export function resetPdfSizes() {
  lengths.clear();
}
registerResettable(resetPdfSizes);
export function pdfUrl(href: string, pageUrl: string) {
  try {
    const url = new URL(href, pageUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.pathname.toLowerCase().endsWith(".pdf")) return null;
    return url.href;
  } catch {
    return null;
  }
}
export function contentLength(url: string, signal?: AbortSignal) {
  const cached = lengths.get(url);
  if (cached) return cached;
  const pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8e3);
    const requestSignal2 = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    try {
      const response = await auditFetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: requestSignal2,
        headers: { "User-Agent": getUserAgent() }
      });
      const raw = response.headers.get("content-length");
      if (!raw) return null;
      const size = Number(raw);
      return Number.isFinite(size) ? size : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
  lengths.set(url, pending);
  return pending;
}
export function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export const pdfSizeRule = defineRule({
  id: "crawl-pdf-size",
  name: "Linked PDF Size",
  description: "Checks that linked PDF files are at most 10 MB",
  category: "crawl",
  weight: 3,
  run: async (context) => {
    const urls: string[] = [];
    context.$("a[href]").each((_, el) => {
      if (urls.length >= SAMPLE_LIMIT7) return;
      const href = pdfUrl(context.$(el).attr("href") || "", context.url);
      if (href && !urls.includes(href)) urls.push(href);
    });
    if (urls.length === 0) {
      return pass("crawl-pdf-size", "No PDF links on the page", { pdfs: [] });
    }
    const oversized = [];
    for (const url of urls) {
      const bytes = await contentLength(url, context.signal);
      if (bytes !== null && bytes > WARN_BYTES) oversized.push({ url, bytes });
    }
    if (oversized.length === 0) {
      return pass("crawl-pdf-size", "Linked PDFs are within 10 MB, or their size was not advertised", {
        checked: urls.length
      });
    }
    const summary = oversized.map((item) => `${item.url} (${formatMb(item.bytes)})`).join("; ");
    return warn("crawl-pdf-size", `Linked PDF over 10 MB: ${summary}`, {
      oversized,
      recommendation: "Compress the PDF or split it. Files over 10 MB are slow to download and to crawl."
    });
  }
});
