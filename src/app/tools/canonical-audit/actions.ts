"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import { auditCanonicals, type CanonicalAuditResult } from "@/lib/canonical-audit";
import { recordToolRun, type FindingDraft } from "@/lib/tool-findings";
import { clientIdFrom } from "@/lib/client-id-field";
import type { CanonicalIssue } from "@/lib/canonical-audit";

/**
 * One finding per kind of canonical problem, not one per page.
 *
 * A 200-page crawl can return 180 pages missing a canonical, and 180
 * rows say nothing 1 row does not. The URLs go in the details, where
 * they are readable, rather than into 180 signatures nobody can mark
 * resolved.
 *
 * Deliberately NOT mapped into TOOL_FINDING_MAP. The crawler already
 * emits missing_canonical and friends per page, with a URL the agent can
 * act on; the same problem arriving through a second vocabulary would be
 * planned twice and counted twice against the per-run cap. This tool
 * crawls deeper than the audit does, so it earns its place as a view for
 * a person — not as a second source of the same action.
 */
function canonicalFindings(
  issues: CanonicalIssue[],
  t: (key: string, values?: Record<string, string | number>) => string,
): FindingDraft[] {
  const byKind = new Map<string, CanonicalIssue[]>();
  for (const i of issues) {
    if (i.kind === "ok") continue;
    const list = byKind.get(i.kind);
    if (list) list.push(i);
    else byKind.set(i.kind, [i]);
  }

  const LABEL: Record<string, string> = {
    missing: t("findingMissing"),
    "off-host": t("findingOffHost"),
    "broken-target": t("findingBrokenTarget"),
    "redirect-target": t("findingRedirectTarget"),
    "self-mismatch": t("findingSelfMismatch"),
    multiple: t("findingMultiple"),
    "noindex-conflict": t("findingNoindexConflict"),
  };

  return [...byKind.entries()].map(([kind, list]) => ({
    signature: `canonical-audit.${kind}`,
    title: t("findingTitle", { label: LABEL[kind] ?? kind, count: list.length }),
    // The worst instance sets the severity. Averaging would let one
    // critical hide behind fifty lows.
    severity: worstSeverity(list),
    category: "canonicalisation",
    details:
      (list[0]?.reason ? list[0].reason + " " : "") +
      t("findingAffected", { urls: list.slice(0, 12).map((i) => i.url).join(", ") }) +
      (list.length > 12 ? t("findingAndMore", { count: list.length - 12 }) : "."),
  }));
}

function worstSeverity(list: CanonicalIssue[]): FindingDraft["severity"] {
  const order = ["critical", "high", "medium", "low"] as const;
  for (const s of order) if (list.some((i) => i.severity === s)) return s;
  return "low";
}

const schema = z.object({
  startUrl: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  maxPages: z.coerce.number().int().min(20).max(200).default(80),
});

export type CanonState =
  | { ok: true; result: CanonicalAuditResult }
  | { ok: false; error: string };

export async function runCanonical(
  _prev: CanonState | null,
  formData: FormData,
): Promise<CanonState> {
  await requireSignedIn();
  const parsed = schema.safeParse({
    startUrl: formData.get("startUrl"),
    maxPages: formData.get("maxPages") || 80,
  });
  const t = await getTranslations("tools.ui.canonical-audit");
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("invalidInput") };
  const clientId = clientIdFrom(formData);
  const r = await auditCanonicals(parsed.data);
  if (!r.ok && r.error) return { ok: false, error: r.error };
  await recordToolRun({
    toolId: "canonical-audit",
    label: parsed.data.startUrl,
    clientId,
    input: { ...parsed.data, clientId },
    result: { ok: true, result: r },
    findings: canonicalFindings(r.issues, t),
  });
  return { ok: true, result: r };
}
