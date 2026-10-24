import { getUserAgent } from "@/audit/crawler/user-agent";
import { registerResettable } from "@/audit/engine/rule-registry";
import { auditFetch } from "@/audit/crawler/net";

export type ProbeResult = { status: number; contentType: string; body: string } | null;
export const cache = new Map<string, Promise<ProbeResult>>();
export function resetGeoProbes() {
  cache.clear();
}
registerResettable(resetGeoProbes);
export function probeOnce(url: string, headers: Record<string, string> = {}, signal?: AbortSignal): Promise<ProbeResult> {
  const key = `${url}
${JSON.stringify(headers)}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = (async (): Promise<ProbeResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8e3);
    const requestSignal2 = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    try {
      const response = await auditFetch(url, {
        headers: { "User-Agent": getUserAgent(), ...headers },
        redirect: "follow",
        signal: requestSignal2
      });
      const body = (await response.text()).slice(0, 4e3);
      return {
        status: response.status,
        contentType: response.headers.get("content-type") || "",
        body
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
  cache.set(key, pending);
  return pending;
}
export function looksLikeHtml(result: { status?: number; contentType: string; body: string }) {
  return /text\/html/i.test(result.contentType) || /^\s*<!doctype html/i.test(result.body) || /^\s*<html[\s>]/i.test(result.body);
}
