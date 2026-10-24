"use client";

import { useActionState } from "react";
import { usePresetUrl } from "@/components/use-preset-url";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { runEeatAudit, type EeatState } from "./actions";
import { AiFeedback } from "@/components/ai-feedback";
import { AiDisclaimer } from "@/components/ai-disclaimer";

export function EeatForm() {
  // Prefilled when opened from a client, so the domain is not retyped.
  const presetUrl = usePresetUrl();
  const t = useTranslations("tools.ui.eeat-audit");
  const [state, formAction, pending] = useActionState<EeatState | null, FormData>(
    runEeatAudit,
    null,
  );

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_160px]">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("pageUrl")}</span>
            <input
              name="url"
              defaultValue={presetUrl}
              required
              placeholder="https://yoursite.com/blog/post"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-5 inline-flex h-9 items-center rounded-md bg-emerald-500/15 px-5 text-sm font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("auditing")}
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 size-4" />
                {t("submit")}
              </>
            )}
          </button>
        </div>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Pillar label={t("signals.experience")} value={state.result.score.experience} />
            <Pillar label={t("signals.expertise")} value={state.result.score.expertise} />
            <Pillar label={t("signals.authority")} value={state.result.score.authority} />
            <Pillar label={t("signals.trust")} value={state.result.score.trust} />
          </div>

          <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {t("totalScore")}{" "}
                <span
                  className={
                    state.result.score.total >= 75
                      ? "text-emerald-300"
                      : state.result.score.total >= 50
                        ? "text-amber-300"
                        : "text-rose-300"
                  }
                >
                  {state.result.score.total}/100
                </span>
              </h2>
              <span className="text-xs text-muted-foreground">
                {state.result.score.total >= 75
                  ? t("strong")
                  : state.result.score.total >= 50
                    ? t("mixed")
                    : t("needsWork")}
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full ${
                  state.result.score.total >= 75
                    ? "bg-emerald-400/70"
                    : state.result.score.total >= 50
                      ? "bg-amber-400/70"
                      : "bg-rose-400/70"
                }`}
                style={{ width: `${state.result.score.total}%` }}
              />
            </div>
          </section>

          <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-semibold">{t("detectedSignals")}</h3>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <SignalRow
                label={t("signals.authorByline")}
                value={state.result.signals.authorName ?? t("none")}
                ok={state.result.signals.hasAuthorByline}
              />
              <SignalRow
                label={t("signals.authorBio")}
                value={state.result.signals.hasAuthorBio ? t("yes") : t("missing")}
                ok={state.result.signals.hasAuthorBio}
              />
              <SignalRow
                label={t("signals.personSchema")}
                value={state.result.signals.hasAuthorSchema ? t("yes") : t("missing")}
                ok={state.result.signals.hasAuthorSchema}
              />
              <SignalRow
                label={t("signals.reviewerLine")}
                value={state.result.signals.hasReviewerLine ? t("yes") : t("missing")}
                ok={state.result.signals.hasReviewerLine}
              />
              <SignalRow
                label={t("signals.published")}
                value={state.result.signals.publishedDate ?? t("none")}
                ok={state.result.signals.hasPublishedDate}
              />
              <SignalRow
                label={t("signals.updated")}
                value={state.result.signals.updatedDate ?? t("none")}
                ok={state.result.signals.hasUpdatedDate}
              />
              <SignalRow
                label={t("signals.outboundCitations")}
                value={t("citationsValue", {
                  count: state.result.signals.outboundCitationCount,
                  authoritative: state.result.signals.authoritativeCitationCount,
                })}
                ok={state.result.signals.outboundCitationCount >= 3}
              />
              <SignalRow
                label={t("signals.articleSchema")}
                value={state.result.signals.hasArticleSchema ? t("yes") : t("missing")}
                ok={state.result.signals.hasArticleSchema}
              />
              <SignalRow
                label={t("signals.organizationSchema")}
                value={state.result.signals.hasOrganizationSchema ? t("yes") : t("missing")}
                ok={state.result.signals.hasOrganizationSchema}
              />
              <SignalRow
                label={t("signals.aboutLink")}
                value={state.result.signals.hasAboutLink ? t("yes") : t("missing")}
                ok={state.result.signals.hasAboutLink}
              />
              <SignalRow
                label={t("signals.contactLink")}
                value={state.result.signals.hasContactLink ? t("yes") : t("missing")}
                ok={state.result.signals.hasContactLink}
              />
              <SignalRow
                label={t("signals.privacyLink")}
                value={state.result.signals.hasPrivacyLink ? t("yes") : t("missing")}
                ok={state.result.signals.hasPrivacyLink}
              />
              <SignalRow
                label={t("signals.editorialPolicy")}
                value={state.result.signals.hasEditorialPolicy ? t("yes") : t("missing")}
                ok={state.result.signals.hasEditorialPolicy}
              />
              <SignalRow
                label="HTTPS"
                value={state.result.signals.hasHttps ? t("yes") : t("no")}
                ok={state.result.signals.hasHttps}
              />
              <SignalRow
                label={t("signals.altCoverage")}
                value={`${state.result.signals.describedImageCount}/${state.result.signals.imageCount}`}
                ok={
                  state.result.signals.imageCount === 0 ||
                  state.result.signals.describedImageCount /
                    Math.max(1, state.result.signals.imageCount) >=
                    0.7
                }
              />
            </div>
          </section>

          {state.result.missing.length > 0 && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-semibold">{t("missingSignals")}</h3>
              <ul className="space-y-1 text-sm">
                {state.result.missing.map((m) => (
                  <li key={m} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-400" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.result.brief && (
            <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{t("punchList")}</h2>
                <AiFeedback
                  feature="content_idea"
                  aiOutput={state.result.brief}
                  size="sm"
                />
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {state.result.brief}
              </pre>
              <AiDisclaimer />
            </section>
          )}
        </>
      )}
    </>
  );
}

function Pillar({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 18
      ? "text-emerald-300"
      : value >= 12
        ? "text-amber-300"
        : "text-rose-300";
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
        <span className="text-sm text-muted-foreground/60">/25</span>
      </div>
    </div>
  );
}

function SignalRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-3 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`truncate font-medium ${ok ? "text-emerald-300" : "text-rose-300"}`}
      >
        {value}
      </span>
    </div>
  );
}
