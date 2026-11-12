"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { AiPurpose } from "@/lib/ai-purpose";
import type { GuardrailMode } from "@/lib/guardrails";
import { saveCharter, saveGuardrails, saveMemoryMode, savePurposeModel } from "./defaults-actions";

export type ModelOption = { provider: string; model: string; label: string };

/**
 * One row per use: a select listing the models of every provider that has
 * a key, plus "workspace model". Saves on change.
 */
export function PurposeModelRow({
  purpose,
  options,
  current,
}: {
  purpose: AiPurpose;
  options: ModelOption[];
  current: { provider: string; model: string } | null;
}) {
  const t = useTranslations("settings.aiDefaults");
  const router = useRouter();
  const key = (o: { provider: string; model: string }) => `${o.provider}|${o.model}`;
  const [value, setValue] = useState(current ? key(current) : "");
  const [state, setState] = useState<"idle" | "saved" | string>("idle");
  const [pending, start] = useTransition();
  const known = !current || options.some((o) => key(o) === key(current));

  return (
    <div className="gsk-row">
      <div className="gsk-row-info">
        <span className="gsk-row-label">{t(`purposes.${purpose}.label`)}</span>
        <p className="gsk-row-desc">{t(`purposes.${purpose}.hint`)}</p>
      </div>
      <div className="gsk-row-control flex flex-col items-end gap-1">
        <select
          className="gsk-select max-w-[320px]"
          value={value}
          disabled={pending}
          aria-label={t(`purposes.${purpose}.label`)}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            setState("idle");
            const [provider, ...rest] = next.split("|");
            start(async () => {
              const res = await savePurposeModel(purpose, next ? { provider, model: rest.join("|") } : null);
              setState(res.ok ? "saved" : res.error);
              if (res.ok) router.refresh();
            });
          }}
        >
          <option value="">
            {purpose === "embeddings" ? t("noEmbeddings") : t("workspaceModel")}
          </option>
          {!known && current ? (
            <option value={key(current)}>{t("unavailable", { model: current.model || current.provider })}</option>
          ) : null}
          {options.map((o) => (
            <option key={key(o)} value={key(o)}>
              {o.label}
            </option>
          ))}
        </select>
        {state === "saved" && !pending ? (
          <span className="gsk-help gsk-status-ok inline-flex items-center gap-1">
            <CheckCircle2 className="size-3.5" />
            {t("saved")}
          </span>
        ) : state !== "idle" && state !== "saved" ? (
          <span className="gsk-help gsk-status-error inline-flex items-center gap-1">
            <AlertCircle className="size-3.5" />
            {state}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const MODES: GuardrailMode[] = ["off", "mask", "block"];

export function GuardrailsForm({
  mode: initialMode,
  blockedTerms: initialTerms,
}: {
  mode: GuardrailMode;
  blockedTerms: string[];
}) {
  const t = useTranslations("settings.aiDefaults");
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [terms, setTerms] = useState(initialTerms.join("\n"));
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const save = (nextMode: GuardrailMode, nextTerms: string) =>
    start(async () => {
      setSaved(false);
      const res = await saveGuardrails({
        mode: nextMode,
        blockedTerms: nextTerms.split("\n"),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });

  return (
    <>
      <div className="gsk-row">
        <div className="gsk-row-info">
          <span className="gsk-row-label">{t("guardMode")}</span>
          <p className="gsk-row-desc">{t(`modes.${mode}.hint`)}</p>
        </div>
        <div className="gsk-row-control">
          <div className="gsk-segmented" role="group" aria-label={t("guardMode")}>
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                disabled={pending}
                onClick={() => {
                  setMode(m);
                  save(m, terms);
                }}
              >
                {t(`modes.${m}.label`)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="gsk-row">
        <div className="gsk-row-info">
          <span className="gsk-row-label">{t("blockedTerms")}</span>
          <p className="gsk-row-desc">{t("blockedTermsHint")}</p>
        </div>
        <div className="gsk-row-control flex w-full max-w-[320px] flex-col items-end gap-2">
          <textarea
            className="gsk-textarea"
            value={terms}
            rows={4}
            placeholder={t("blockedTermsPlaceholder")}
            aria-label={t("blockedTerms")}
            onChange={(e) => {
              setTerms(e.target.value);
              setSaved(false);
            }}
          />
          <div className="flex items-center gap-2">
            {saved && !pending ? (
              <span className="gsk-help gsk-status-ok inline-flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                {t("saved")}
              </span>
            ) : null}
            <button
              type="button"
              className="gsk-btn gsk-btn--primary"
              disabled={pending}
              onClick={() => save(mode, terms)}
            >
              {pending ? t("saving") : t("saveTerms")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function CharterForm({ charter }: { charter: string }) {
  const t = useTranslations("settings.aiDefaults");
  const router = useRouter();
  const [text, setText] = useState(charter);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="gsk-row gsk-row--stacked">
      <div className="gsk-row-info">
        <span className="gsk-row-label">{t("charter")}</span>
        <p className="gsk-row-desc">{t("charterHint")}</p>
      </div>
      <div className="gsk-row-control flex w-full flex-col items-end gap-2">
        <textarea
          className="gsk-textarea w-full"
          rows={5}
          maxLength={2000}
          value={text}
          placeholder={t("charterPlaceholder")}
          aria-label={t("charter")}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
        />
        <div className="flex items-center gap-2">
          {error ? (
            <span className="gsk-help gsk-status-error inline-flex items-center gap-1">
              <AlertCircle className="size-3.5" />
              {error}
            </span>
          ) : saved && !pending ? (
            <span className="gsk-help gsk-status-ok inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5" />
              {t("saved")}
            </span>
          ) : null}
          <button
            type="button"
            className="gsk-btn gsk-btn--primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await saveCharter(text);
                if (!r.ok) return setError(r.error);
                setSaved(true);
                router.refresh();
              })
            }
          >
            {pending ? t("saving") : t("saveCharter")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MemoryModeRow({ mode: initial }: { mode: "on_request" | "auto" }) {
  const t = useTranslations("settings.aiDefaults");
  const router = useRouter();
  const [mode, setMode] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div className="gsk-row">
      <div className="gsk-row-info">
        <span className="gsk-row-label">{t("memoryMode")}</span>
        <p className="gsk-row-desc">{t(`memoryModes.${mode}.hint`)}</p>
      </div>
      <div className="gsk-row-control">
        <div className="gsk-segmented" role="group" aria-label={t("memoryMode")}>
          {(["on_request", "auto"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setMode(m);
                  await saveMemoryMode(m);
                  router.refresh();
                })
              }
            >
              {t(`memoryModes.${m}.label`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
