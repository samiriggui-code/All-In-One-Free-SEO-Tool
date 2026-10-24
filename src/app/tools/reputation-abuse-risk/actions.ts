"use server";

import { requireSignedIn } from "@/lib/action-guard";
import { getTranslations } from "next-intl/server";

import {
  runReputationAbuseScan,
  type RiskReport,
} from "@/lib/reputation-abuse-risk";
import { recordToolRun } from "@/lib/tool-findings";
import { reputationRiskFindings } from "@/lib/tool-finding-builders";

export type ScanState =
  | { ok: true; report: RiskReport }
  | { ok: false; error: string }
  | null;

export async function scanForRisk(
  _prev: ScanState,
  formData: FormData,
): Promise<ScanState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.reputation-abuse-risk");
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, error: t("errEnterUrl") };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: t("errInvalidUrl") };
  }
  try {
    const report = await runReputationAbuseScan(parsed.toString(), 30);
    await recordToolRun({
      toolId: "reputation-abuse-risk",
      label: t("runLabel", {
        domain: report.domain,
        overall: t(`risk.${report.overall}`),
        sections: report.sections.length,
      }),
      input: { url: parsed.toString() },
      result: { ok: true, report },
      findings: reputationRiskFindings(report),
    });
    return { ok: true, report };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("errScanFailed"),
    };
  }
}
