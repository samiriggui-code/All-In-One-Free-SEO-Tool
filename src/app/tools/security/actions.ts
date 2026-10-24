"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { recordToolRun, type FindingDraft } from "@/lib/tool-findings";
import { guardedFetch } from "@/lib/url-guard";

export type SecurityResult =
  | {
      ok: true;
      hostname: string;
      observatory: ObservatoryResult | null;
      ssl: SslResult | null;
      headers: HttpHeader[];
    }
  | { ok: false; error: string };

export type ObservatoryResult = {
  grade: string | null;
  score: number | null;
  testsPassed: number;
  testsFailed: number;
  scanId: number | null;
};

export type SslResult = {
  grade: string | null;
  protocol: string | null;
  validFrom: string | null;
  validTo: string | null;
  issuer: string | null;
};

export type HttpHeader = {
  name: string;
  value: string;
  good: boolean;
  hint?: string;
};

const HEADER_CHECKS: Array<{
  name: string;
  hint: string;
  expected?: RegExp;
}> = [
  {
    name: "strict-transport-security",
    hint: "Forces HTTPS for future visits. Should include max-age and includeSubDomains.",
    expected: /max-age=\d+/i,
  },
  {
    name: "content-security-policy",
    hint: "Prevents XSS by allow-listing script sources.",
  },
  {
    name: "x-content-type-options",
    hint: "Should be 'nosniff'.",
    expected: /nosniff/i,
  },
  {
    name: "x-frame-options",
    hint: "Prevents clickjacking. SAMEORIGIN or DENY.",
    expected: /sameorigin|deny/i,
  },
  {
    name: "referrer-policy",
    hint: "Controls how much of the URL is sent on link-clicks.",
  },
  {
    name: "permissions-policy",
    hint: "Restricts browser feature access (camera, mic, etc).",
  },
];

function hostnameOf(rawUrl: string): string | null {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, timeoutMs = 12_000): Promise<T | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await guardedFetch(url, {
      signal: c.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function checkObservatory(host: string): Promise<ObservatoryResult | null> {
  // Mozilla Observatory v2 API (free, no key)
  // https://observatory.mozilla.org/api/v2/scan?host=example.com
  type ObsResp = {
    id?: number;
    grade?: string;
    score?: number;
    tests_passed?: number;
    tests_failed?: number;
  };
  const data = await fetchJson<ObsResp>(
    `https://observatory-api.mdn.mozilla.net/api/v2/scan?host=${encodeURIComponent(host)}`,
  );
  if (!data) return null;
  return {
    grade: data.grade ?? null,
    score: data.score ?? null,
    testsPassed: data.tests_passed ?? 0,
    testsFailed: data.tests_failed ?? 0,
    scanId: data.id ?? null,
  };
}

async function checkSsl(host: string): Promise<SslResult | null> {
  // SSL Labs analyze API (free, no key, but slow first call)
  // We do a single non-startNew call to check cached result; if not cached,
  // we kick off + return what we have.
  type SslLabsResp = {
    status?: string;
    endpoints?: {
      grade?: string;
      details?: {
        protocols?: { name: string; version: string }[];
        cert?: {
          notBefore?: number;
          notAfter?: number;
          subject?: string;
          issuerSubject?: string;
        };
      };
    }[];
  };
  const data = await fetchJson<SslLabsResp>(
    `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(host)}&fromCache=on&maxAge=24`,
  );
  if (!data) return null;
  const ep = data.endpoints?.[0];
  if (!ep) return null;
  const cert = ep.details?.cert;
  return {
    grade: ep.grade ?? null,
    protocol: ep.details?.protocols?.[0]
      ? `${ep.details.protocols[0].name} ${ep.details.protocols[0].version}`
      : null,
    validFrom: cert?.notBefore
      ? new Date(cert.notBefore).toISOString().slice(0, 10)
      : null,
    validTo: cert?.notAfter
      ? new Date(cert.notAfter).toISOString().slice(0, 10)
      : null,
    issuer: cert?.issuerSubject ?? null,
  };
}

async function checkHeaders(rawUrl: string): Promise<HttpHeader[]> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  try {
    const res = await guardedFetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; SeoToolBot/0.1; +https://localhost)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    return HEADER_CHECKS.map((c) => {
      const value = res.headers.get(c.name) ?? "";
      const good = value
        ? c.expected
          ? c.expected.test(value)
          : true
        : false;
      return { name: c.name, value, good, hint: c.hint };
    });
  } catch {
    return HEADER_CHECKS.map((c) => ({
      name: c.name,
      value: "",
      good: false,
      hint: c.hint,
    }));
  }
}

/**
 * The security problems worth putting on somebody's list.
 *
 * Missing headers are grouped into one finding rather than one each:
 * they are set in the same place, usually in the same commit, and five
 * rows for one edit is five things to close for one piece of work.
 *
 * Not mapped for the agent. Every one of these is set on the server or
 * the CDN — a WordPress plugin cannot add HSTS — so planning them would
 * manufacture actions the agent has no way to carry out. That honesty
 * is the point of the map being small.
 */
function securityFindings(
  t: Awaited<ReturnType<typeof getTranslations>>,
  headers: HttpHeader[],
  ssl: SslResult | null,
  observatory: ObservatoryResult | null,
): FindingDraft[] {
  const out: FindingDraft[] = [];

  const missing = headers.filter((h) => !h.good);
  if (missing.length > 0) {
    out.push({
      signature: "security.missing_headers",
      title: t("findMissingTitle", { count: missing.length }),
      severity: missing.length >= 4 ? "medium" : "low",
      category: "security",
      details: t("findMissingDetails", {
        headers: missing.map((h) => h.name).join(", "),
      }),
    });
  }

  // A failing TLS grade is the one thing here a visitor sees, because
  // the browser is what tells them.
  if (ssl?.grade && /^[CDEFT]/i.test(ssl.grade)) {
    out.push({
      signature: "security.weak_tls",
      title: t("findWeakTlsTitle", { grade: ssl.grade }),
      severity: /^[EFT]/i.test(ssl.grade) ? "high" : "medium",
      category: "security",
      details: t("findWeakTlsDetails", {
        protocol: ssl.protocol ?? t("unknown"),
        issuer: ssl.issuer ?? t("unknown"),
      }),
    });
  }

  // A certificate about to lapse is the failure that takes a whole site
  // off the internet, and it always looks fine right up until it does.
  if (ssl?.validTo) {
    const days = Math.floor(
      (new Date(ssl.validTo).getTime() - Date.now()) / 86_400_000,
    );
    if (Number.isFinite(days) && days < 30) {
      out.push({
        signature: "security.cert_expiring",
        title:
          days < 0
            ? t("findCertExpiredTitle")
            : t("findCertExpiringTitle", { days }),
        severity: days < 7 ? "critical" : "high",
        category: "security",
        details: t("findCertDetails", { validTo: ssl.validTo }),
      });
    }
  }

  if (observatory?.grade && /^[DEF]/i.test(observatory.grade)) {
    out.push({
      signature: "security.observatory_low",
      title: t("findObservatoryTitle", { grade: observatory.grade }),
      severity: "low",
      category: "security",
      details: t("findObservatoryDetails", {
        failed: observatory.testsFailed,
        total: observatory.testsPassed + observatory.testsFailed,
      }),
    });
  }

  return out;
}

export async function checkSecurity(
  rawUrl: string,
  clientId?: number | null,
): Promise<SecurityResult> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.security");
  if (!rawUrl?.trim()) return { ok: false, error: t("errUrlRequired") };
  const host = hostnameOf(rawUrl);
  if (!host) return { ok: false, error: t("errInvalidUrl") };

  const [observatory, ssl, headers] = await Promise.all([
    checkObservatory(host).catch(() => null),
    checkSsl(host).catch(() => null),
    checkHeaders(rawUrl),
  ]);

  const out: SecurityResult = { ok: true, hostname: host, observatory, ssl, headers };
  await recordToolRun({
    toolId: "security",
    label: `${host} · obs ${observatory?.grade ?? "—"} · ssl ${ssl?.grade ?? "—"}`,
    clientId: clientId ?? null,
    input: { url: rawUrl, clientId },
    result: out,
    findings: securityFindings(t, headers, ssl, observatory),
  });
  return out;
}
