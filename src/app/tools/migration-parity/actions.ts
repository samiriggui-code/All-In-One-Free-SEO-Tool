"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { auditParity, type ParityReport } from "@/lib/migration-parity";
import { recordToolRun } from "@/lib/tool-findings";
import { parityFindings } from "@/lib/tool-finding-builders";

export type ParityState =
  | { ok: true; report: ParityReport }
  | { ok: false; error: string };

export async function runParity(
  _prev: ParityState | null,
  formData: FormData,
): Promise<ParityState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.migration-parity");
  const raw = String(formData.get("oldUrls") ?? "").trim();
  const newDomain = String(formData.get("newDomain") ?? "").trim() || undefined;
  if (!raw) return { ok: false, error: t("pasteUrls") };
  const oldUrls = Array.from(
    new Set(
      raw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).slice(0, 500);
  if (oldUrls.length === 0) return { ok: false, error: t("noUrls") };
  try {
    const report = await auditParity({ oldUrls, newDomain });
    await recordToolRun({
      toolId: "migration-parity",
      label: `${t("runLabel", { count: oldUrls.length })}${newDomain ? ` → ${newDomain}` : ""}`,
      input: { newDomain, urlCount: oldUrls.length },
      result: { ok: true, report },
      findings: parityFindings(report),
    });
    return { ok: true, report };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? t("auditFailed") };
  }
}
