"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import {
  scanWordPressHack,
  type HackScanReport,
} from "@/lib/wp-hack-scanner";
import { recordToolRun } from "@/lib/tool-findings";
import { wpHackFindings } from "@/lib/tool-finding-builders";

export type WpHackState =
  | { ok: true; report: HackScanReport }
  | { ok: false; error: string }
  | null;

export async function runWpHackScan(
  _prev: WpHackState,
  formData: FormData,
): Promise<WpHackState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.wp-hack-scan");
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, error: t("errNoUrl") };
  try {
    const report = await scanWordPressHack(url);
    if (!report.homepageReachable) {
      return { ok: false, error: t("errUnreachable", { url }) };
    }
    await recordToolRun({
      toolId: "wp-hack-scan",
      label: t("runLabel", {
        domain: report.domain,
        risk: t(`risk.${report.riskLevel}`),
        count: report.iocs.length,
      }),
      input: { url },
      result: { ok: true, report },
      findings: wpHackFindings(report),
  });
    return { ok: true, report };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("errScanFailed"),
    };
  }
}
