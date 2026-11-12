"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetClientVoice, trainClientVoice } from "@/app/content/actions";

/** The fields a profile can carry, in the order they are shown. */
const FIELDS = [
  "tone",
  "voice",
  "authorPersona",
  "avgSentenceLength",
  "vocabularyLevel",
  "headingCase",
  "contractions",
  "listsVsProse",
  "ctaStyle",
] as const;
const LISTS = ["phrasesToKeep", "phrasesToAvoid"] as const;

type Profile = Record<string, unknown>;

export function VoiceEditor({
  clientId,
  editable,
  initial,
  ownArticles,
}: {
  clientId: number;
  editable: boolean;
  initial: Profile | null;
  ownArticles: number;
}) {
  const t = useTranslations("content.voice");
  const tErr = useTranslations("content.errors");
  const [profile, setProfile] = useState<Profile | null>(initial);
  const [samples, setSamples] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const show = (v: unknown) => (typeof v === "boolean" ? (v ? t("yes") : t("no")) : String(v));
  const rows = profile ? FIELDS.filter((f) => profile[f] !== undefined && profile[f] !== null && profile[f] !== "") : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-semibold text-foreground">{t("currentTitle")}</h2>
          {editable && profile && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(t("confirmReset"))) return;
                setError(null);
                start(async () => {
                  const r = await resetClientVoice({ clientId });
                  if (r.ok) setProfile(null);
                  else setError(tErr(r.error));
                });
              }}
            >
              <RotateCcw className="size-3.5" />
              {t("reset")}
            </Button>
          )}
        </div>
        {!profile ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <>
            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {rows.map((f) => (
                <div key={f} className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 text-sm">
                  <dt className="text-muted-foreground">{t(`fields.${f}`)}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {f === "avgSentenceLength" ? t("words", { count: Number(profile[f]) }) : show(profile[f])}
                  </dd>
                </div>
              ))}
            </dl>
            {LISTS.map((key) => {
              const items = Array.isArray(profile[key]) ? (profile[key] as unknown[]).map(String) : [];
              if (items.length === 0) return null;
              return (
                <div key={key} className="mt-4">
                  <h3 className="text-xs font-medium text-muted-foreground">{t(`fields.${key}`)}</h3>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {items.map((x) => (
                      <li key={x} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </>
        )}
      </section>

      {editable && (
        <section className="space-y-3 rounded-2xl border border-border bg-card/40 p-5">
          <h2 className="text-sm font-semibold text-foreground">{profile ? t("retrainTitle") : t("trainTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("trainHint")}</p>
          <textarea
            value={samples}
            onChange={(e) => setSamples(e.target.value)}
            rows={10}
            maxLength={60000}
            placeholder={t("placeholder")}
            aria-label={t("samplesLabel")}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={pending || (samples.trim().length < 200 && ownArticles === 0)}
              onClick={() => {
                setError(null);
                start(async () => {
                  const r = await trainClientVoice({ clientId, samples });
                  if (r.ok) {
                    setProfile((r.profile as Profile | null) ?? null);
                    setSamples("");
                  } else setError(tErr(r.error));
                });
              }}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {samples.trim().length >= 200 || ownArticles === 0 ? t("train") : t("trainFromArticles", { count: ownArticles })}
            </Button>
            <span className="text-xs text-muted-foreground">{t("aiNote")}</span>
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </section>
      )}
    </div>
  );
}
