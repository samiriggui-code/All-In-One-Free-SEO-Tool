"use server";

import { requireSignedIn } from "@/lib/action-guard";
import { getTranslations } from "next-intl/server";

import { traceMany, type RedirectChain } from "@/lib/redirect-tracer";
import { recordToolRun, type FindingDraft } from "@/lib/tool-findings";
import { clientIdFrom } from "@/lib/client-id-field";

export type BulkState =
  | { ok: true; chains: RedirectChain[] }
  | { ok: false; error: string };

/**
 * What the traces found that is worth doing something about.
 *
 * One finding per URL for the chains, not one for all of them, because
 * each is a different redirect to write and the agent applies them one
 * at a time. The URL is in the signature for the same reason — two
 * chains on two pages are two pieces of work.
 *
 * These DO map to the agent: "redirect_chain" is in TOOL_FINDING_MAP and
 * the executor can now write a redirect, so a chain found here becomes a
 * rule on the site with an undo. That is the loop this tool has been one
 * step short of since it was written.
 */
function chainFindings(
  chains: RedirectChain[],
  t: (key: string, values?: Record<string, string | number>) => string,
): FindingDraft[] {
  const out: FindingDraft[] = [];

  for (const c of chains) {
    // A loop is not a chain to shorten — it never resolves at all, so
    // the page is unreachable rather than slow.
    if (c.hadLoop) {
      out.push({
        signature: `redirects-bulk.loop.${c.startUrl}`,
        title: t("findings.loopTitle", { url: c.startUrl }),
        severity: "critical",
        category: "redirects",
        details: t("findings.loopDetails", { hops: c.hopCount }),
      });
      continue;
    }

    if (c.hopCount > 1) {
      out.push({
        signature: `redirects-bulk.chain.${c.startUrl}`,
        title: t("findings.chainTitle", { hops: c.hopCount, finalUrl: c.finalUrl }),
        severity: c.hopCount > 2 ? "medium" : "low",
        category: "redirects",
        details: t("findings.chainDetails", {
          url: c.startUrl,
          finalUrl: c.finalUrl,
        }),
      });
    }

    // http somewhere in a chain that ends on https means the first hop
    // is unencrypted, whatever the destination is.
    if (c.hadMixedScheme) {
      out.push({
        signature: `redirects-bulk.mixed_scheme.${c.startUrl}`,
        title: t("findings.mixedTitle", { url: c.startUrl }),
        severity: "medium",
        category: "redirects",
        details: t("findings.mixedDetails"),
      });
    }

    if (c.finalStatus >= 400) {
      out.push({
        signature: `redirects-bulk.dead.${c.startUrl}`,
        title: t("findings.deadTitle", { url: c.startUrl, status: c.finalStatus }),
        severity: c.finalStatus === 404 ? "high" : "medium",
        category: "redirects",
        details: t("findings.deadDetails", {
          hops: c.hopCount,
          finalUrl: c.finalUrl,
          status: c.finalStatus,
        }),
      });
    }
  }

  return out;
}

export async function runBulk(
  _prev: BulkState | null,
  formData: FormData,
): Promise<BulkState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.redirects-bulk");
  const raw = String(formData.get("urls") ?? "").trim();
  if (!raw) return { ok: false, error: t("errPasteUrl") };

  const urls = Array.from(
    new Set(
      raw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => /^https?:\/\/|^[a-z0-9.-]+\.[a-z]{2,}/i.test(s)),
    ),
  ).slice(0, 100);
  if (urls.length === 0) return { ok: false, error: t("errNoValidUrls") };

  try {
    const chains = await traceMany(urls);
    const clientId = clientIdFrom(formData);
    await recordToolRun({
      toolId: "redirects-bulk",
      label: t("runLabel", { count: urls.length }),
      clientId,
      input: { urlCount: urls.length, clientId },
      result: { ok: true, chains },
      findings: chainFindings(chains, t),
    });
    return { ok: true, chains };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? t("errTraceFailed") };
  }
}
