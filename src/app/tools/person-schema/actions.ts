"use server";

import { requireSignedIn } from "@/lib/action-guard";
import { getTranslations } from "next-intl/server";

import { saveToolRun } from "@/lib/tool-runs";

export type SaveState =
  | { ok: true; runId: number }
  | { ok: false; error: string }
  | null;

export async function savePersonSchema(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.person-schema");
  const name = String(formData.get("name") ?? "").trim();
  const jsonld = String(formData.get("jsonld") ?? "").trim();
  if (!name) return { ok: false, error: t("errNameRequired") };
  if (!jsonld) return { ok: false, error: t("errGenerateFirst") };
  try {
    const id = await saveToolRun({
      toolId: "person-schema",
      label: name,
      input: { name },
      result: { jsonld },
    });
    return { ok: true, runId: id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("errSaveFailed"),
    };
  }
}
