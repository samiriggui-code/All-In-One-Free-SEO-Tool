"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Layers,
  Link2,
  ListChecks,
  Loader2,
  MapPin,
  Sparkles,
  XCircle,
} from "lucide-react";
import { playbookToTasks, runCompetitorAnalysis, type PlaybookState } from "./actions";
import { AiFeedback } from "@/components/ai-feedback";
import { AiDisclaimer } from "@/components/ai-disclaimer";

export function PlaybookForm({
  clients,
}: {
  clients: { id: number; name: string }[];
}) {
  const tx = useTranslations("ui.app_competitors_playbook_playbook-form");
  const [state, formAction, pending] = useActionState<
    PlaybookState | null,
    FormData
  >(runCompetitorAnalysis, null);

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{tx("competitorUrl")}</span>
            <input
              name="competitorUrl"
              required
              placeholder="https://competitor.com"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{tx("yourSiteOptional")}</span>
            <input
              name="myUrl"
              placeholder="https://yoursite.com"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{tx("country")}</span>
            <input
              name="country"
              defaultValue="US"
              maxLength={4}
              placeholder="US"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm uppercase focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-violet-500/15 px-5 text-sm font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              {tx("crawlingAndAnalysing13")}
            </>
          ) : (
            tx("reverseEngineerTheirSeo")
          )}
        </button>
        <p className="text-[11px] text-muted-foreground">
          {tx("crawlsUpTo50Pages")}
        </p>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <>
          {state.playbook.synthesis && (
            <section className="glass-apple relative overflow-hidden rounded-2xl">
              <header className="border-b border-white/[0.06] px-5 py-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-violet-300" />
                  {tx("punchListWhatTheyDo")}
                </h2>
              </header>
              <div className="space-y-3 p-5">
                <p className="whitespace-pre-wrap text-sm">
                  {state.playbook.synthesis}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <AiFeedback
                      feature="general"
                      aiOutput={state.playbook.synthesis}
                      size="sm"
                    />
                    <AiDisclaimer variant="inline" />
                  </div>
                  <PlaybookToTasksButton
                    clients={clients}
                    competitorUrl={state.playbook.competitorUrl}
                    synthesis={state.playbook.synthesis}
                  />
                </div>
              </div>
            </section>
          )}
          {state.playbook.synthesisError && !state.playbook.synthesis && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-inset ring-amber-500/30">
              {state.playbook.synthesisError}
            </p>
          )}

          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Layers className="size-4 text-cyan-300" />
                {tx("contentSilos", { length: state.playbook.silos.length })}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {tx("theDirectoryGroupsTheyInvest")}
              </p>
            </header>
            <ul className="divide-y divide-white/[0.05]">
              {state.playbook.silos.map((s) => (
                <li key={s.silo} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <code className="rounded-md bg-white/5 px-2 py-0.5 text-[11px]">
                    /{s.silo}/
                  </code>
                  <span className="font-medium tabular-nums">{tx("pages", { count: s.count })}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {s.sample.map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {u.replace(/^https?:\/\/[^/]+/, "")}
                      </a>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-300" />
              {tx("onPageRankingSignals")}
            </h2>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 md:grid-cols-3">
              <Signal
                label={tx("avgWordCount")}
                value={`${state.playbook.signals.avgWordCount}`}
              />
              <Signal
                label={tx("longFormPages1500Words")}
                value={`${state.playbook.signals.longFormCount}`}
              />
              <Signal
                label={tx("schemaTypes")}
                value={
                  state.playbook.signals.schemaTypes.length > 0
                    ? state.playbook.signals.schemaTypes.join(", ")
                    : "(none)"
                }
              />
              <Signal label="HTTPS" value={state.playbook.signals.https ? "✓" : "✗"} />
              <Signal
                label={tx("metaDescription")}
                value={state.playbook.signals.hasMetaDescription ? "✓" : "✗"}
              />
              <Signal
                label={tx("canonicalTag")}
                value={state.playbook.signals.usesCanonical ? "✓" : "✗"}
              />
              <Signal
                label={tx("openGraphTags")}
                value={`${state.playbook.signals.ogTagCount}`}
              />
              <Signal
                label={tx("internalLinksHomepage")}
                value={`${state.playbook.signals.avgInternalLinks}`}
              />
            </div>
          </section>

          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Link2 className="size-4 text-violet-300" />
                {tx("pagesLinkingToTheCompetitor")}
                {state.playbook.backlinks.filter((b) => b.status === "verified").length})
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {tx.rich("eachPageBelowWasFetched", { b0: (chunks) => <a href="/tools/link-intersect" className="underline hover:no-underline">{chunks}</a> })}
              </p>
            </header>
            {state.playbook.backlinks.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                {tx("noExternalMentionsSurfaced")}
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.04] max-h-[360px] overflow-y-auto">
                {state.playbook.backlinks.map((b) => (
                  <li key={b.url} className="px-5 py-3 text-xs">
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 truncate font-medium hover:underline"
                    >
                      {b.title || b.domain}
                      <ExternalLink className="size-3 opacity-60" />
                    </a>
                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {b.domain}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                      {b.status === "verified" ? (
                        <span
                          className={
                            b.follow === "dofollow" ? "text-sky-300" : undefined
                          }
                          title={b.rel ? `rel="${b.rel}"` : tx("noRelAttribute")}
                        >
                          {tx("link", { follow: b.follow })}
                        </span>
                      ) : (
                        <span className="text-amber-300">
                          {tx("mentionsThemNoLinkFound")}
                        </span>
                      )}
                      {b.anchorText && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">
                          {b.anchorText}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <MapPin className="size-4 text-cyan-300" />
                {tx("citationFootprint")}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {tx("topDirectoriesTheCompetitorAppears")}
              </p>
            </header>
            <ul className="divide-y divide-white/[0.04]">
              {state.playbook.citationStatus.map((c) => (
                <li
                  key={c.citation.name}
                  className="flex items-center gap-3 px-5 py-3 text-sm"
                >
                  {c.listed === true ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
                  ) : c.listed === false ? (
                    <XCircle className="size-4 shrink-0 text-rose-300" />
                  ) : (
                    <Globe className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={c.citation.submitUrl ?? c.citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline"
                    >
                      {c.citation.name}
                    </a>
                    <div className="text-[10px] text-muted-foreground">
                      {c.citation.category.replace(/_/g, " ")} ·{" "}
                      {"★".repeat(c.citation.importance)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ring-1 ring-inset ${
                      c.listed === true
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                        : c.listed === false
                          ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                          : "bg-white/5 text-muted-foreground ring-white/10"
                    }`}
                  >
                    {c.listed === true
                      ? tx("listed")
                      : c.listed === false
                        ? tx("gap")
                        : "?"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {state.playbook.techStack.technologies.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
              <h2 className="text-base font-semibold">
                {tx("detectedTechStack")}
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {state.playbook.techStack.technologies.map((t) => (
                  <span
                    key={t.name}
                    className="rounded-md bg-white/5 px-2 py-1 text-[11px] ring-1 ring-inset ring-white/10"
                  >
                    {t.name}{" "}
                    <span className="text-muted-foreground">
                      ({t.category})
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-base font-semibold">
                {tx("crawledPages", { pageCount: state.playbook.pageCount })}
              </h2>
            </header>
            <ul className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
              {state.playbook.pages.map((p) => (
                <li key={p.url} className="px-5 py-2.5 text-xs">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 truncate font-medium hover:underline"
                  >
                    {p.title || p.url}
                    <ExternalLink className="size-3 opacity-60" />
                  </a>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <code className="rounded bg-white/5 px-1.5 py-0.5">
                      /{p.silo}/
                    </code>
                    <span>{tx("words", { wordCount: p.wordCount })}</span>
                    {p.h1 && <span>· H1: {p.h1.slice(0, 60)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function PlaybookToTasksButton({
  clients,
  competitorUrl,
  synthesis,
}: {
  clients: { id: number; name: string }[];
  competitorUrl: string;
  synthesis: string;
}) {
  const tx = useTranslations("ui.app_competitors_playbook_playbook-form");
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [clientId, setClientId] = useState(
    clients[0]?.id ? String(clients[0].id) : "",
  );
  const [error, setError] = useState<string | null>(null);

  if (clients.length === 0) {
    return (
      <span className="text-[10px] text-muted-foreground">
        {tx("addAClientFirstTo")}
      </span>
    );
  }

  if (done) {
    return (
      <span className="text-[11px] text-emerald-300">{done}</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="h-7 rounded-md border border-white/10 bg-card/60 px-2 text-[10px]"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending || !clientId}
        onClick={() => {
          setPending(true);
          setError(null);
          startTransition(async () => {
            const r = await playbookToTasks({
              clientId: Number(clientId),
              competitorUrl,
              synthesis,
            });
            setPending(false);
            if (r.ok) setDone(`✓ ${r.created} tasks added`);
            else setError(r.error ?? "failed");
          });
        }}
        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <ListChecks className="size-3" />
        )}
        {tx("convertToTasks")}
      </button>
      {error && <span className="text-[10px] text-rose-300">{error}</span>}
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-black/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}
