"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { scanSerp } from "@/lib/serp-scanner";
import { saveToolRun } from "@/lib/tool-runs";

export type RankWhereResult = {
  domain: string;
  query: string;
  country: string;
  topN: number;
  /** Position 1-N if found, null if not in top N. */
  position: number | null;
  /** The exact URL that ranks. */
  rankingUrl: string | null;
  /** The page title that ranks. */
  rankingTitle: string | null;
  /** Competitors at #1, #2, #3 (or just below your position). */
  topCompetitors: { position: number; domain: string; url: string; title: string }[];
  /** Competitors directly above (your "outrank these next" list). */
  outrankTargets: { position: number; domain: string; url: string; title: string }[];
  /** Whether AI Overview is present for this query. */
  aiOverviewPresent: boolean;
  /** Whether you're cited in the AI Overview. */
  citedInAiOverview: boolean;
  /** Featured snippet info. */
  featuredSnippet: { domain: string; url: string } | null;
  /** Concrete fix recommendations. */
  recommendations: string[];
};

export type RankWhereState =
  | { ok: true; result: RankWhereResult }
  | { ok: false; error: string }
  | null;

function normalizeDomain(d: string): string {
  return d
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export async function checkRank(
  _prev: RankWhereState,
  formData: FormData,
): Promise<RankWhereState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.rank-where");
  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  const query = String(formData.get("query") ?? "").trim();
  const country = String(formData.get("country") ?? "US").trim().toUpperCase();
  const topNRaw = Number(formData.get("topN") ?? 100);
  const topN = ([10, 20, 50, 100].includes(topNRaw) ? topNRaw : 100) as
    | 10
    | 20
    | 50
    | 100;

  if (!domain) return { ok: false, error: t("domainRequired") };
  if (!query) return { ok: false, error: t("keywordRequired") };

  const serp = await scanSerp({
    query,
    country,
    clientDomain: domain,
    topN,
  });
  if (!serp.ok) {
    return {
      ok: false,
      error: serp.error ?? t("serpFailed"),
    };
  }

  // Find domain in results
  const found = serp.topResults.find((r) =>
    normalizeDomain(r.domain) === domain ||
    normalizeDomain(r.domain).endsWith("." + domain),
  );

  const top3 = serp.topResults.slice(0, 3).map((r) => ({
    position: r.position,
    domain: r.domain,
    url: r.url,
    title: r.title,
  }));

  // Outrank targets — 3 competitors immediately above
  let outrankTargets: typeof top3 = [];
  if (found) {
    outrankTargets = serp.topResults
      .filter((r) => r.position < found.position)
      .slice(-3)
      .map((r) => ({
        position: r.position,
        domain: r.domain,
        url: r.url,
        title: r.title,
      }));
  } else {
    outrankTargets = top3;
  }

  const citedInAiOverview = !!(
    serp.aiOverviewSources &&
    serp.aiOverviewSources.some((src) =>
      normalizeDomain(src) === domain ||
      normalizeDomain(src).endsWith("." + domain),
    )
  );

  // Recommendations
  const recommendations: string[] = [];
  if (!found) {
    recommendations.push(t("recoNotFound", { topN, query, country }));
    recommendations.push(t("recoLandingPage"));
    if (
      top3.length > 0 &&
      top3.some((c) => /reddit\.com|wikipedia\.org|youtube\.com/i.test(c.domain))
    ) {
      recommendations.push(t("recoEntrenched"));
    }
  } else if (found.position > 10) {
    recommendations.push(
      t("recoBeyondPage1", {
        position: found.position,
        page: Math.ceil(found.position / 10),
      }),
    );
    recommendations.push(t("recoGeoScore"));
    recommendations.push(t("recoAioPassage"));
  } else if (found.position > 3) {
    recommendations.push(t("recoStriking", { position: found.position }));
    recommendations.push(t("recoRefresh"));
  } else {
    recommendations.push(t("recoTop3", { position: found.position }));
  }
  if (serp.aiOverviewPresent && !citedInAiOverview) {
    recommendations.push(t("recoAioNotCited"));
  }
  if (
    !found &&
    serp.featuredSnippet &&
    normalizeDomain(serp.featuredSnippet.url).includes(domain)
  ) {
    recommendations.push(t("recoSnippetOnly"));
  }

  const result: RankWhereResult = {
    domain,
    query,
    country,
    topN,
    position: found?.position ?? null,
    rankingUrl: found?.url ?? null,
    rankingTitle: found?.title ?? null,
    topCompetitors: top3,
    outrankTargets,
    aiOverviewPresent: serp.aiOverviewPresent,
    citedInAiOverview,
    featuredSnippet: serp.featuredSnippet
      ? {
          domain: serp.featuredSnippet.url
            ? new URL(serp.featuredSnippet.url).hostname.replace(/^www\./, "")
            : "",
          url: serp.featuredSnippet.url,
        }
      : null,
    recommendations,
  };
  await saveToolRun({
    toolId: "rank-where",
    label: `${domain} · "${query}" (${country}) · ${found ? `#${found.position}` : t("runNotInTop", { topN })}`,
    input: { domain, query, country, topN },
    result: { ok: true, result },
  }).catch(() => undefined);
  return { ok: true, result };
}
