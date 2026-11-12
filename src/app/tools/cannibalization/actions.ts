"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { fetchGscPerformance } from "@/lib/google-oauth";
import { recordToolRun } from "@/lib/tool-findings";
import { cannibalFindings } from "@/lib/tool-finding-builders";
import {
  groupCannibalization,
  TOOL_RULES,
  type CannibalizationGroup,
} from "@/lib/cannibalization";

export type CannibalGroup = CannibalizationGroup & {
  /** The single page that should "win" — currently the one with the best position. */
  recommendedKeeper: string;
};

export type CannibalState =
  | {
      ok: true;
      siteUrl: string;
      groups: CannibalGroup[];
      summary: {
        groupsFound: number;
        highSeverity: number;
        queriesAnalyzed: number;
      };
    }
  | { ok: false; error: string };

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Cannibalization is when ≥2 pages on the same site compete for the
 * same query — Google can't decide which to rank, both suffer. We
 * detect it from GSC: pull 28 days of query + page data, bucket by
 * query, flag any query where 2+ pages each pull ≥5 impressions and
 * average position is in the top 30.
 *
 * Severity rules: TOOL_RULES in lib/cannibalization.ts.
 *
 * The recommended keeper is the page with the best (lowest) average
 * position — usually the one Google is leaning toward anyway. The fix
 * is then: consolidate the other pages via canonical or 301, or
 * differentiate their content + intent.
 */
export async function runCannibalScan(
  _prev: CannibalState | null,
  formData: FormData,
): Promise<CannibalState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.cannibalization");
  const siteUrl = String(formData.get("site") ?? "").trim();
  if (!siteUrl) return { ok: false, error: t("pickProperty") };

  try {
    const rows = await fetchGscPerformance({
      siteUrl,
      startDate: daysAgo(28),
      endDate: daysAgo(1),
      dimensions: ["query", "page"],
      rowLimit: 5000,
    });

    const scan = groupCannibalization(rows, TOOL_RULES);
    // The recommended keeper is the best-placed page, first in the list.
    const groups: CannibalGroup[] = scan.groups.map((g) => ({
      ...g,
      recommendedKeeper: g.pages[0].page,
    }));

    const highSeverity = groups.filter((g) => g.severity === "high").length;

    await recordToolRun({
      toolId: "cannibalization",
      label: `${siteUrl} · ${groups.length} group${groups.length === 1 ? "" : "s"} · ${highSeverity} high`,
      input: { siteUrl },
      result: {
        groupsFound: groups.length,
        highSeverity,
        queriesAnalyzed: scan.queriesAnalyzed,
      },
      findings: cannibalFindings(groups),
    });

    return {
      ok: true,
      siteUrl,
      groups: groups.slice(0, 50),
      summary: {
        groupsFound: groups.length,
        highSeverity,
        queriesAnalyzed: scan.queriesAnalyzed,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : t("gscFetchFailed");
    return { ok: false, error: message };
  }
}
