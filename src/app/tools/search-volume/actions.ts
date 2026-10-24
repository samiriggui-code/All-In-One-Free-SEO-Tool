"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import {
  estimateBulk,
  type VolumeEstimate,
} from "@/lib/search-volume";
import { saveToolRun } from "@/lib/tool-runs";

const inputSchema = z.object({
  queries: z.string().trim().min(1).max(20_000),
  country: z.string().trim().min(2).max(8).default("US"),
});

export type EstimateState =
  | { ok: true; estimates: VolumeEstimate[] }
  | { ok: false; error: string };

export async function estimateVolumes(
  _prev: EstimateState | null,
  formData: FormData,
): Promise<EstimateState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.search-volume");
  const parsed = inputSchema.safeParse({
    queries: formData.get("queries"),
    country: formData.get("country") || "US",
  });
  if (!parsed.success) {
    return { ok: false, error: t("errInvalidInput") };
  }
  const queries = parsed.data.queries
    .split(/\r?\n|,/)
    .map((q) => q.trim())
    .filter((q) => q.length > 1 && q.length < 200)
    .slice(0, 30);
  if (queries.length === 0) {
    return { ok: false, error: t("errNoQueries") };
  }

  const estimates = await estimateBulk({
    queries,
    country: parsed.data.country,
  });
  await saveToolRun({
    toolId: "search-volume",
    label: t("runLabel", {
      count: queries.length,
      country: parsed.data.country,
    }),
    input: { country: parsed.data.country, count: queries.length },
    result: { ok: true, estimates },
  }).catch(() => undefined);
  return { ok: true, estimates };
}
