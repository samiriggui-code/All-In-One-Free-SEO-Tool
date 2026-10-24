"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { logFeedback, type AiFeature } from "@/lib/ai-learn";

export async function logAiFeedbackAction(opts: {
  feature: AiFeature;
  clientId: number | null;
  aiOutput: string;
  rating: 1 | -1;
  correctedOutput?: string;
  note?: string;
}): Promise<{ ok: boolean }> {
  await requireSignedIn();
  const r = await logFeedback({
    feature: opts.feature,
    clientId: opts.clientId ?? undefined,
    aiOutput: opts.aiOutput,
    rating: opts.rating,
    correctedOutput: opts.correctedOutput,
    note: opts.note,
  });
  return { ok: r.ok };
}
