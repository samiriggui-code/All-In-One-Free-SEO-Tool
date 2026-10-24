"use server";

import { requireSignedIn } from "@/lib/action-guard";

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
  const name = String(formData.get("name") ?? "").trim();
  const jsonld = String(formData.get("jsonld") ?? "").trim();
  if (!name) return { ok: false, error: "Person name is required." };
  if (!jsonld) return { ok: false, error: "Generate the JSON-LD first." };
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
      error: e instanceof Error ? e.message : "Save failed.",
    };
  }
}
