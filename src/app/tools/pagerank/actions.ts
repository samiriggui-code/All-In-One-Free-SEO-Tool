"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import { simulatePageRank, type PageRankResult } from "@/lib/pagerank";
import { saveToolRun } from "@/lib/tool-runs";

const schema = z.object({
  startUrl: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  maxPages: z.coerce.number().int().min(20).max(300).default(150),
});

export type PrState =
  | { ok: true; result: PageRankResult }
  | { ok: false; error: string };

export async function runPagerank(
  _prev: PrState | null,
  formData: FormData,
): Promise<PrState> {
  await requireSignedIn();
  const parsed = schema.safeParse({
    startUrl: formData.get("startUrl"),
    maxPages: formData.get("maxPages") || 150,
  });
  if (!parsed.success)
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        (await getTranslations("tools.ui.pagerank"))("invalidInput"),
    };
  const r = await simulatePageRank(parsed.data);
  if (!r.ok && r.error) return { ok: false, error: r.error };
  await saveToolRun({
    toolId: "pagerank",
    label: parsed.data.startUrl,
    input: parsed.data,
    result: { ok: true, result: r },
  }).catch(() => undefined);
  return { ok: true, result: r };
}
