"use server";

import { revalidatePath } from "next/cache";
import { requireSettingsAdmin } from "@/lib/auth";
import { requireSignedIn } from "@/lib/action-guard";
import { actionTx } from "@/lib/action-tx";
import { AI_PURPOSES, normalizePurposeModel, purposeSettingKey, type AiPurpose } from "@/lib/ai-purpose";
import { normalizeGuardrails, type GuardrailMode } from "@/lib/guardrails";
import { deleteSetting, setSetting } from "@/lib/settings-store";

/**
 * Settings → AI: the model for each use and the local guardrails. Both
 * change what every AI call in the workspace does, so only the owner
 * may change them.
 */

export type DefaultsResult = { ok: true } | { ok: false; error: string };

/** `choice` is `null` to go back to the workspace model. */
export async function savePurposeModel(
  purpose: AiPurpose,
  choice: { provider: string; model: string } | null,
): Promise<DefaultsResult> {
  await requireSettingsAdmin();
  await requireSignedIn();
  const tx = await actionTx("settings.aiDefaults");
  if (!(AI_PURPOSES as readonly string[]).includes(purpose)) {
    return { ok: false, error: tx("errors.unknownPurpose") };
  }
  if (choice === null) {
    await deleteSetting(purposeSettingKey(purpose));
  } else {
    const clean = normalizePurposeModel(choice, purpose);
    if (!clean) return { ok: false, error: tx("errors.unknownModel") };
    await setSetting(purposeSettingKey(purpose), clean);
  }
  revalidatePath("/settings/ai");
  return { ok: true };
}

export async function saveGuardrails(input: {
  mode: GuardrailMode;
  blockedTerms: string[];
}): Promise<DefaultsResult> {
  await requireSettingsAdmin();
  await requireSignedIn();
  const clean = normalizeGuardrails(input);
  await setSetting("guardrails.mode", clean.mode);
  await setSetting("guardrails.blocked_terms", clean.blockedTerms);
  revalidatePath("/settings/ai");
  return { ok: true };
}

const CHARTER_MAX_CHARS = 2000;

/** The agency's charter: rules every assistant answer follows (IA-4). */
export async function saveCharter(text: string): Promise<DefaultsResult> {
  await requireSettingsAdmin();
  await requireSignedIn();
  const tx = await actionTx("settings.aiDefaults");
  const clean = String(text ?? "").trim();
  if (clean.length > CHARTER_MAX_CHARS) return { ok: false, error: tx("errors.charterTooLong", { max: CHARTER_MAX_CHARS }) };
  if (clean) await setSetting("ai.charter", clean);
  else await deleteSetting("ai.charter");
  revalidatePath("/settings/ai");
  return { ok: true };
}
