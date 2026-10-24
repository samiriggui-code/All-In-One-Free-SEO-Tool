"use client";

import { useActionState, useEffect, useState } from "react";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  fetchBingInsights,
  fetchBingSites,
  submitBingUrls,
  type BingInsightsState,
  type BingSubmitState,
} from "./actions";

export function BingTool() {
  const t = useTranslations("tools.ui.bing");
  const [sites, setSites] = useState<
    | { url: string; verified: boolean }[]
    | "loading"
    | { error: string }
  >("loading");

  const [insightsState, insightsAction, loadingInsights] = useActionState<
    BingInsightsState | null,
    FormData
  >(fetchBingInsights, null);

  const [submitState, submitAction, submitting] = useActionState<
    BingSubmitState | null,
    FormData
  >(submitBingUrls, null);

  const [siteUrl, setSiteUrl] = useState("");

  useEffect(() => {
    fetchBingSites().then((r) => {
      if (r.ok) setSites(r.sites);
      else setSites({ error: r.error });
    });
  }, []);

  return (
    <>
      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Globe className="size-4 text-cyan-300" />
          {t("verifiedSites")}
        </h2>
        {sites === "loading" ? (
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> {t("loading")}
          </p>
        ) : "error" in sites ? (
          <p className="mt-2 text-xs text-rose-300">{sites.error}</p>
        ) : sites.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t.rich("noSites", {
              link: (chunks) => (
                <a
                  href="https://www.bing.com/webmasters"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sites.map((s) => (
              <button
                key={s.url}
                type="button"
                onClick={() => setSiteUrl(s.url)}
                className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-mono text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-foreground"
              >
                {s.url.replace(/^https?:\/\//, "")}
              </button>
            ))}
          </div>
        )}
      </section>

      <form
        action={insightsAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">{t("siteUrl")}</span>
          <input
            name="siteUrl"
            required
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://example.com/"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm font-mono focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <button
          type="submit"
          disabled={loadingInsights}
          className="inline-flex h-9 items-center rounded-md bg-cyan-500/15 px-4 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {loadingInsights ? t("loading") : t("pull")}
        </button>
      </form>

      {insightsState && !insightsState.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {insightsState.error}
        </p>
      )}

      {insightsState?.ok && (
        <>
          {insightsState.quota && (
            <p className="text-xs text-muted-foreground">
              {t("quota", {
                daily: insightsState.quota.daily,
                monthly: insightsState.quota.monthly,
              })}
            </p>
          )}

          <Section title={t("topQueries", { count: insightsState.queries.length })}>
            <DataTable
              cols={[t("colQuery"), t("colClicks"), t("colImpressions"), t("colPosition")]}
              empty={t("noData")}
              rows={insightsState.queries.map((q) => [
                q.query,
                String(q.clicks),
                String(q.impressions),
                q.position.toFixed(1),
              ])}
            />
          </Section>

          <Section title={t("topPages", { count: insightsState.pages.length })}>
            <DataTable
              cols={[t("colPage"), t("colClicks"), t("colImpressions"), t("colPosition")]}
              empty={t("noData")}
              rows={insightsState.pages.map((p) => [
                <a
                  key={p.page}
                  href={p.page}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 truncate font-mono text-xs hover:underline"
                >
                  {p.page.replace(/^https?:\/\/[^/]+/, "")}
                  <ExternalLink className="size-3 opacity-60" />
                </a>,
                String(p.clicks),
                String(p.impressions),
                p.position.toFixed(1),
              ])}
            />
          </Section>

          <Section title={t("crawlIssues", { count: insightsState.issues.length })}>
            {insightsState.issues.length === 0 ? (
              <p className="px-5 py-4 text-xs text-muted-foreground">
                {t("noIssues")}
              </p>
            ) : (
              <DataTable
                cols={[t("colUrl"), t("colStatus"), t("colCrawled")]}
                empty={t("noData")}
                rows={insightsState.issues.map((i) => [
                  i.url,
                  String(i.httpCode),
                  i.crawledDate,
                ])}
              />
            )}
          </Section>
        </>
      )}

      <form
        action={submitAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <h2 className="text-base font-semibold">{t("submitTitle")}</h2>
        <input type="hidden" name="siteUrl" value={siteUrl} />
        <textarea
          name="urls"
          required
          rows={6}
          placeholder={"https://example.com/blog/post-1\nhttps://example.com/blog/post-2"}
          className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 font-mono text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="submit"
          disabled={submitting || !siteUrl}
          className="inline-flex h-9 items-center rounded-md bg-cyan-500/15 px-4 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
        {submitState && submitState.ok && (
          <p className="text-xs text-emerald-300">
            {t("submitted", { count: submitState.submitted })}
          </p>
        )}
        {submitState && !submitState.ok && (
          <p className="text-xs text-rose-300">{submitState.error}</p>
        )}
      </form>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </header>
      {children}
    </section>
  );
}

function DataTable({
  cols,
  rows,
  empty,
}: {
  cols: string[];
  rows: (string | React.ReactNode)[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-4 text-xs text-muted-foreground">{empty}</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted-foreground">
            {cols.map((c, i) => (
              <th
                key={c}
                className={`px-5 py-3 font-medium ${i === 0 ? "text-left" : "text-right"}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-white/[0.02]">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={`px-5 py-2.5 ${j === 0 ? "" : "text-right tabular-nums text-muted-foreground"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
