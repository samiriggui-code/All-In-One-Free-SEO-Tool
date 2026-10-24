"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import { findSoft404s, type Soft404Result } from "@/lib/soft-404-catcher";
import { recordToolRun, type FindingDraft } from "@/lib/tool-findings";
import { clientIdFrom } from "@/lib/client-id-field";

const schema = z.object({
  startUrl: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  maxPages: z.coerce.number().int().min(20).max(300).default(100),
});

export type SoftState =
  | { ok: true; result: Soft404Result }
  | { ok: false; error: string };

/**
 * Pages that answer 200 while saying nothing is there.
 *
 * One finding per reason, not per page. The reason is the stable part —
 * "these pages return 200 and read as errors" — while which pages do it
 * changes as a site is edited, and a per-page signature would be a new
 * finding every crawl that nobody could ever close.
 *
 * Not mapped for the agent. A soft 404 is fixed by making the page
 * return 404, or by giving it real content, and which of those is right
 * depends on whether the page was supposed to exist. That is a decision.
 */
function softFindings(
  t: Awaited<ReturnType<typeof getTranslations>>,
  r: Soft404Result,
): FindingDraft[] {
  if (r.flagged.length === 0) return [];

  const byReason = new Map<string, typeof r.flagged>();
  for (const f of r.flagged) {
    const list = byReason.get(f.reason);
    if (list) list.push(f);
    else byReason.set(f.reason, [f]);
  }

  return [...byReason.entries()].map(([reason, list]) => ({
    signature: `soft-404.${reason}`,
    title: t("findingTitle", {
      label: t.has(`findingLabels.${reason}`)
        ? t(`findingLabels.${reason}`)
        : reason,
      count: list.length,
    }),
    // A page Google indexes as real content when it is an error page
    // competes with the pages that are real. More of them is worse.
    severity: list.length >= 5 ? "high" : "medium",
    category: "indexation",
    details:
      t("findingDetails", {
        urls: list.slice(0, 10).map((f) => f.url).join(", "),
      }) +
      (list.length > 10 ? t("findingMore", { count: list.length - 10 }) : "."),
  }));
}

export async function runSoft404(
  _prev: SoftState | null,
  formData: FormData,
): Promise<SoftState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.soft-404");
  const parsed = schema.safeParse({
    startUrl: formData.get("startUrl"),
    maxPages: formData.get("maxPages") || 100,
  });
  if (!parsed.success)
    return { ok: false, error: t("errInvalidInput") };
  const r = await findSoft404s(parsed.data);
  if (!r.ok && r.error) return { ok: false, error: r.error };
  const clientId = clientIdFrom(formData);
  await recordToolRun({
    toolId: "soft-404",
    label: t("runLabel", {
      url: parsed.data.startUrl,
      flagged: r.flagged.length,
      checked: r.pagesChecked,
    }),
    clientId,
    input: { ...parsed.data, clientId },
    result: { ok: true, result: r },
    findings: softFindings(t, r),
  });
  return { ok: true, result: r };
}
