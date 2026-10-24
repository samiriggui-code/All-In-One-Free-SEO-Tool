"use server";

import { requireSignedIn } from "@/lib/action-guard";
import { getTranslations } from "next-intl/server";

import {
  generateProgramPages,
  parseCsv,
  type ProgramResult,
} from "@/lib/programmatic-seo";
import { saveToolRun } from "@/lib/tool-runs";

export type ProgState =
  | { ok: true; result: ProgramResult }
  | { ok: false; error: string };

export async function runProgram(
  _prev: ProgState | null,
  formData: FormData,
): Promise<ProgState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.programmatic-seo");
  const csv = String(formData.get("csv") ?? "").trim();
  const slugPattern = String(formData.get("slugPattern") ?? "").trim();
  const titlePattern = String(formData.get("titlePattern") ?? "").trim();
  const metaPattern = String(formData.get("metaPattern") ?? "").trim();
  const bodyTemplate = String(formData.get("bodyTemplate") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const primaryColumn = String(formData.get("primaryColumn") ?? "").trim() || undefined;
  const secondaryColumn =
    String(formData.get("secondaryColumn") ?? "").trim() || undefined;

  if (!csv) return { ok: false, error: t("errCsv") };
  if (!slugPattern || !titlePattern || !metaPattern || !bodyTemplate)
    return { ok: false, error: t("errTemplates") };
  if (!baseUrl) return { ok: false, error: t("errBaseUrl") };

  let rows: Record<string, string>[] = [];
  try {
    rows = parseCsv(csv);
  } catch (err) {
    return { ok: false, error: t("errParse", { message: (err as Error).message }) };
  }
  if (rows.length === 0) return { ok: false, error: t("errNoRows") };
  if (rows.length > 10_000)
    return { ok: false, error: t("errMaxRows") };

  const result = generateProgramPages({
    rows,
    slugPattern,
    titlePattern,
    metaPattern,
    bodyTemplate,
    baseUrl,
    primaryColumn,
    secondaryColumn,
  });
  await saveToolRun({
    toolId: "programmatic-seo",
    label: t("runLabel", { rows: rows.length, pages: result.pages.length }),
    input: { rowCount: rows.length, baseUrl },
    result: { ok: true, result },
  }).catch(() => undefined);
  return { ok: true, result };
}
