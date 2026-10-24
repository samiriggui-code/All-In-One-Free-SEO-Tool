"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import { runBrowserAgent, type AgentResult } from "@/lib/browser-agent";
import { saveToolRun } from "@/lib/tool-runs";

const inputSchema = z.object({
  startUrl: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  goal: z.string().trim().min(10).max(500),
  maxSteps: z.coerce.number().int().min(1).max(25).default(12),
});

export type AgentState =
  | { ok: true; result: AgentResult }
  | { ok: false; error: string };

export async function runAgent(
  _prev: AgentState | null,
  formData: FormData,
): Promise<AgentState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.browser-agent");
  const parsed = inputSchema.safeParse({
    startUrl: formData.get("startUrl"),
    goal: formData.get("goal"),
    maxSteps: formData.get("maxSteps") || 12,
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const error =
      field === "startUrl"
        ? t("errInvalidUrl")
        : field === "goal"
          ? t("errGoal")
          : field === "maxSteps"
            ? t("errMaxSteps")
            : t("errInvalidInput");
    return { ok: false, error };
  }
  try {
    const r = await runBrowserAgent({
      startUrl: parsed.data.startUrl,
      goal: parsed.data.goal,
      maxSteps: parsed.data.maxSteps,
    });
    await saveToolRun({
      toolId: "browser-agent",
      label: `${parsed.data.startUrl} · "${parsed.data.goal.slice(0, 60)}"`,
      input: {
        startUrl: parsed.data.startUrl,
        goal: parsed.data.goal,
        maxSteps: parsed.data.maxSteps,
      },
      result: { ok: true, result: r },
    }).catch(() => undefined);
    return { ok: true, result: r };
  } catch (err) {
    return { ok: false, error: (err as Error).message || t("errRunFailed") };
  }
}
