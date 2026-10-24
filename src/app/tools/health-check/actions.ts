"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { getTranslations } from "next-intl/server";
import { runAudit } from "@/lib/audit";
import { checkRobots } from "@/app/tools/robots/actions";
import { checkHreflang } from "@/app/tools/hreflang/actions";
import { checkSecurity } from "@/app/tools/security/actions";
import { scanCwv } from "@/lib/pagespeed";
import { auditImages } from "@/lib/image-audit";
import { fetchSiteMetadata } from "@/lib/site-metadata";
import { saveSnapshot } from "@/lib/snapshots";
import { recordToolRun, type FindingDraft } from "@/lib/tool-findings";
import { inspectHeaders } from "@/app/tools/headers/actions";

/**
 * One omnibus SEO health check — runs every checker we have in parallel
 * for the same URL, aggregates everything into one verdict + a structured
 * findings list. The user clicks once and gets the same data 6 separate
 * single-purpose tools would have produced.
 */

export type HealthFinding = {
  /** Stable English key (On-page, Security…); the page translates it. */
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  type: string;
  message: string;
  url?: string;
};

export type HealthSummary = {
  score: number; // 0-100
  performanceScore: number | null;
  totalFindings: number;
  byCategory: Record<string, number>;
  bySeverity: Record<HealthFinding["severity"], number>;
};

export type HealthResult =
  | {
      ok: true;
      url: string;
      finalUrl: string;
      summary: HealthSummary;
      findings: HealthFinding[];
      brand: {
        name: string | null;
        description: string | null;
        logoUrl: string | null;
      };
      raw: {
        cwv: Awaited<ReturnType<typeof scanCwv>> | null;
        robots: Awaited<ReturnType<typeof checkRobots>> | null;
        hreflang: Awaited<ReturnType<typeof checkHreflang>> | null;
        security: Awaited<ReturnType<typeof checkSecurity>> | null;
        image: Awaited<ReturnType<typeof auditImages>> | null;
        headers: Awaited<ReturnType<typeof inspectHeaders>> | null;
      };
    }
  | { ok: false; error: string };

const sevWeight: Record<HealthFinding["severity"], number> = {
  critical: 12,
  high: 6,
  medium: 3,
  low: 1,
  info: 0,
};

export async function runHealthCheck(
  rawUrl: string,
  clientId?: number | null,
): Promise<HealthResult> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.health-check");
  if (!rawUrl?.trim()) return { ok: false, error: t("errorRequired") };
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  // All checks fire in parallel; each is best-effort
  const [meta, audit, robots, hreflang, security, cwv, image, headers] =
    await Promise.all([
      fetchSiteMetadata(url).catch(() => null),
      runAudit(url, { maxPages: 1, maxDepth: 0 }).catch(() => null),
      checkRobots(url).catch(() => null),
      checkHreflang(url).catch(() => null),
      checkSecurity(url).catch(() => null),
      scanCwv({ url, strategy: "mobile" }).catch(() => null),
      auditImages(url).catch(() => null),
      inspectHeaders(url).catch(() => null),
    ]);

  if (!meta || !meta.reachable) {
    return { ok: false, error: t("errorUnreachable") };
  }

  const findings: HealthFinding[] = [];

  // === On-page audit ===
  if (audit && audit.findings) {
    for (const f of audit.findings) {
      findings.push({
        category: "On-page",
        severity: (f.severity as HealthFinding["severity"]) ?? "medium",
        type: f.type,
        message: f.message,
        url: f.url,
      });
    }
  }

  // === Robots / sitemap ===
  if (robots && robots.ok) {
    for (const issue of robots.issues) {
      findings.push({
        category: "Indexability",
        severity: /entire site/i.test(issue) ? "critical" : "medium",
        type: "robots_or_sitemap",
        message: issue,
      });
    }
  }

  // === Hreflang ===
  if (hreflang && hreflang.ok && hreflang.entries.length > 0) {
    for (const issue of hreflang.issues) {
      findings.push({
        category: "International",
        severity: "medium",
        type: "hreflang",
        message: issue,
      });
    }
  }

  // === Security headers ===
  if (security && security.ok) {
    for (const h of security.headers) {
      if (!h.good) {
        findings.push({
          category: "Security",
          severity: "low",
          type: `missing_${h.name}`,
          message: t(h.value ? "msg.headerWeak" : "msg.headerMissing", {
            name: h.name,
            hint: h.hint ?? "",
          }),
        });
      }
    }
    if (security.observatory && (security.observatory.score ?? 0) < 50) {
      findings.push({
        category: "Security",
        severity: "medium",
        type: "observatory_low",
        message: t("msg.observatoryLow", {
          grade: security.observatory.grade ?? "?",
          score: security.observatory.score ?? 0,
        }),
      });
    }
    if (security.ssl && security.ssl.grade && /^[CDFE]/.test(security.ssl.grade)) {
      findings.push({
        category: "Security",
        severity: "high",
        type: "ssl_low",
        message: t("msg.sslLow", { grade: security.ssl.grade }),
      });
    }
  }

  // === Core Web Vitals ===
  let performanceScore: number | null = null;
  if (cwv && cwv.ok) {
    performanceScore = cwv.performance;
    if (typeof cwv.performance === "number" && cwv.performance < 50) {
      findings.push({
        category: "Performance",
        severity: "high",
        type: "low_performance",
        message: t("msg.lowPerformance", { score: cwv.performance }),
      });
    }
    if (typeof cwv.lcpMs === "number" && cwv.lcpMs > 4000) {
      findings.push({
        category: "Performance",
        severity: "high",
        type: "lcp_poor",
        message: t("msg.lcpPoor", { seconds: (cwv.lcpMs / 1000).toFixed(1) }),
      });
    }
    if (typeof cwv.cls === "number" && cwv.cls > 25) {
      findings.push({
        category: "Performance",
        severity: "medium",
        type: "cls_poor",
        message: t("msg.clsPoor", { cls: (cwv.cls / 100).toFixed(2) }),
      });
    }
    for (const opp of cwv.opportunities ?? []) {
      if ((opp.savingsMs ?? 0) >= 500) {
        findings.push({
          category: "Performance",
          severity: "low",
          type: opp.id,
          message: t("msg.opportunity", {
            title: opp.title,
            seconds: Math.round((opp.savingsMs ?? 0) / 100) / 10,
          }),
        });
      }
    }
  }

  // === Image audit ===
  if (image && image.ok && image.images.length > 0) {
    const noAlt = image.images.filter((i) => i.issues.includes("missing_alt"));
    const oversize = image.images.filter((i) => i.issues.includes("oversize"));
    const noDims = image.images.filter((i) =>
      i.issues.includes("no_dimensions"),
    );
    if (noAlt.length > 0) {
      findings.push({
        category: "Images",
        severity: "medium",
        type: "missing_alt",
        message: t("msg.missingAlt", { count: noAlt.length }),
      });
    }
    if (oversize.length > 0) {
      findings.push({
        category: "Images",
        severity: "medium",
        type: "oversize_images",
        message: t("msg.oversize", { count: oversize.length }),
      });
    }
    if (noDims.length > 0) {
      findings.push({
        category: "Images",
        severity: "low",
        type: "no_dimensions",
        message: t("msg.noDimensions", { count: noDims.length }),
      });
    }
  }

  // === Redirects ===
  if (headers && headers.ok && headers.totalHops > 1) {
    findings.push({
      category: "On-page",
      severity: headers.totalHops > 2 ? "medium" : "low",
      type: "redirect_chain",
      message: t("msg.redirectChain", { count: headers.totalHops }),
    });
  }

  // === Aggregate ===
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<HealthFinding["severity"], number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  let deductions = 0;
  for (const f of findings) {
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
    bySeverity[f.severity] += 1;
    deductions += sevWeight[f.severity];
  }
  const score = Math.max(0, Math.min(100, 100 - deductions));

  const summary: HealthSummary = {
    score,
    performanceScore,
    totalFindings: findings.length,
    byCategory,
    bySeverity,
  };

  const out = {
    ok: true as const,
    url,
    finalUrl: meta.url,
    summary,
    findings,
    brand: {
      name: meta.name,
      description: meta.description,
      logoUrl: meta.logoUrl,
    },
    raw: { cwv, robots, hreflang, security, image, headers },
  };
  await recordToolRun({
    toolId: "health-check",
    label: `${url} · ${score}/100 · ${findings.length} findings`,
    clientId: clientId ?? null,
    input: { url, clientId },
    result: out,
    findings: healthDrafts(findings),
  });
  return out;
}

/**
 * The tool's findings, as rows that survive the tab closing.
 *
 * Signatures are "health-check.<type>", which is what TOOL_FINDING_MAP
 * keys on — two of them (redirect_chain, broken_link) map onto work the
 * agent can carry out, and the rest stay here for a person to read. The
 * type is the stable part; the message carries counts and wording that
 * change between runs, so matching on it would make every run a fresh
 * set of findings nobody could ever close.
 *
 * One row per type rather than per occurrence: this is a single-page
 * check, so a type appears once anyway, and grouping keeps that true if
 * that ever changes.
 */
function healthDrafts(findings: HealthFinding[]): FindingDraft[] {
  // "info" is an observation, not work. Recording it would put grey rows
  // on a checklist that exists to say what still needs doing. Narrowed
  // here rather than skipped in the loop so the severity that reaches
  // FindingDraft is one the findings table actually accepts.
  type Actionable = HealthFinding & { severity: FindingDraft["severity"] };
  const isActionable = (f: HealthFinding): f is Actionable =>
    f.severity !== "info";

  const byType = new Map<string, Actionable[]>();
  for (const f of findings.filter(isActionable)) {
    const list = byType.get(f.type);
    if (list) list.push(f);
    else byType.set(f.type, [f]);
  }

  return [...byType.entries()].map(([type, list]) => ({
    signature: `health-check.${type}`,
    title: list[0].message,
    severity: list[0].severity,
    category: list[0].category,
    details:
      list.length > 1
        ? list.map((f) => f.message).join(" ")
        : (list[0].url ?? null),
  }));
}

export async function saveHealthSnapshot(opts: {
  url: string;
  result: HealthResult;
  note?: string;
}): Promise<{ ok: true; id: number }> {
  await requireSignedIn();
  if (!opts.result.ok) {
    return Promise.reject(new Error("Can't save a failed health check"));
  }
  const t = await getTranslations("tools.ui.health-check");
  return saveSnapshot({
    clientId: null,
    kind: "cwv",
    label: opts.url,
    note: opts.note ?? t("snapshotNote"),
    data: opts.result,
    primaryMetric: opts.result.summary.score,
    primaryMetricLabel: "health",
  });
}
