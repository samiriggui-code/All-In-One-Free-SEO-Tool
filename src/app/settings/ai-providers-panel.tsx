"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, ExternalLink, Eye, EyeOff, Loader2, Plus, X } from "lucide-react";
import { PROVIDER_CATALOG, type Provider } from "@/lib/api-providers";
import { MODEL_PRESETS } from "@/lib/ai-model-presets";
import type { ActiveProvider } from "@/lib/api-keys";
import { safeFetch } from "@/lib/safe-fetch";
import {
  saveApiKey,
  saveOllamaUrl,
  setActiveProvider,
  setCreditSaverEnabled,
} from "./key-actions";
import { saveDefaultModel } from "./actions";

/*
 * The AI section, laid out like GsKnora's model management
 * (views/settings/ModelSettings.vue + components/settings/SettingDrawer.vue):
 * preference rows on top, then the providers as a grid of compact cards
 * with tabs; a card opens a side drawer with the steps and the key field.
 *
 * It replaces ActiveProviderCard, CreditSaverForm and ApiKeysSection,
 * which stacked thirteen full provider forms (steps, field, buttons) one
 * under the other. Same server actions, same storage.
 */

type CatalogEntry = (typeof PROVIDER_CATALOG)[number];
type Tab = "all" | "configured" | "free";

function initials(label: string) {
  return label
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function Row({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gsk-row">
      <div className="gsk-row-info">
        <label className="gsk-row-label" htmlFor={htmlFor}>
          {label}
        </label>
        {hint ? <p className="gsk-row-desc">{hint}</p> : null}
      </div>
      <div className="gsk-row-control">{children}</div>
    </div>
  );
}

export function AiProvidersPanel({
  configured,
  active,
  defaultModel,
  creditSaver,
  ollamaUrl,
}: {
  configured: Record<string, boolean>;
  active: string | null;
  defaultModel: string | null;
  creditSaver: boolean;
  ollamaUrl: string;
}) {
  const t = useTranslations("settings.aiPanel");
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<CatalogEntry | null>(null);
  const [pending, startTransition] = useTransition();
  const [saver, setSaver] = useState(creditSaver);
  const [model, setModel] = useState(defaultModel ?? "");

  const tierLabel = (tier: CatalogEntry["tier"]) =>
    tier === "free" ? t("tierFree") : tier === "free-tier" ? t("tierFreeTier") : t("tierPaid");

  const configuredList = PROVIDER_CATALOG.filter((p) => configured[p.id]);
  const lists: Record<Tab, CatalogEntry[]> = useMemo(
    () => ({
      all: PROVIDER_CATALOG,
      configured: PROVIDER_CATALOG.filter((p) => configured[p.id]),
      free: PROVIDER_CATALOG.filter((p) => p.tier !== "paid"),
    }),
    [configured],
  );
  const presets = active ? (MODEL_PRESETS[active as ActiveProvider] ?? []) : [];

  return (
    <>
      <section className="gsk-block">
        <div className="gsk-block-head">
          <h2 className="gsk-block-title">{t("prefsTitle")}</h2>
        </div>

        <Row label={t("defaultProvider")} hint={t("defaultProviderHint")} htmlFor="ai-active">
          {configuredList.length === 0 ? (
            <span className="gsk-tag gsk-tag--warning">{t("noneConfigured")}</span>
          ) : (
            <select
              id="ai-active"
              className="gsk-select gsk-w-280"
              value={active ?? ""}
              disabled={pending}
              onChange={(e) =>
                startTransition(() => setActiveProvider(e.target.value as Provider | "ollama"))
              }
            >
              {!active ? <option value="">{t("choose")}</option> : null}
              {configuredList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        </Row>

        {presets.length > 0 ? (
          <Row label={t("model")} hint={t("modelHint")} htmlFor="ai-model">
            <select
              id="ai-model"
              className="gsk-select gsk-w-280"
              value={model}
              disabled={pending}
              onChange={(e) => {
                const next = e.target.value;
                setModel(next);
                startTransition(() => saveDefaultModel(next));
              }}
            >
              <option value="">{t("modelDefault", { name: presets[0].label })}</option>
              {presets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Row>
        ) : null}

        <Row label={t("saver")} hint={t("saverHint")} htmlFor="ai-saver">
          <input
            id="ai-saver"
            type="checkbox"
            role="switch"
            className="gsk-switch"
            checked={saver}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.checked;
              setSaver(next);
              startTransition(() => setCreditSaverEnabled(next));
            }}
          />
        </Row>
      </section>

      <section className="gsk-block">
        <div className="gsk-block-head">
          <h2 className="gsk-block-title">{t("providersTitle")}</h2>
          <p className="gsk-block-description">{t("providersHint")}</p>
        </div>

        <div className="gsk-tabbar" role="tablist">
          {(["all", "configured", "free"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className="gsk-tab"
              onClick={() => setTab(k)}
            >
              {t(`tab_${k}`)}
              <span className="gsk-tab__count">{lists[k].length}</span>
            </button>
          ))}
        </div>

        <div className="gsk-card-grid">
          {lists[tab].map((p) => {
            const on = Boolean(configured[p.id]);
            return (
              <button
                key={p.id}
                type="button"
                className={on ? "gsk-card gsk-card--on" : "gsk-card"}
                onClick={() => setOpen(p)}
              >
                <span className="gsk-card__badge" aria-hidden>
                  {initials(p.label)}
                </span>
                <span className="gsk-card__body">
                  <span className="gsk-card__header">
                    <span className="gsk-card__title">{p.label}</span>
                    {active === p.id ? (
                      <span className="gsk-tag gsk-tag--brand">{t("default")}</span>
                    ) : null}
                  </span>
                  <span className="gsk-card__subtitle">
                    <span className={on ? "gsk-dot gsk-dot--on" : "gsk-dot"} />
                    {on ? t("configured") : t("notConfigured")}
                    <span className="gsk-card__sep">·</span>
                    {tierLabel(p.tier)}
                  </span>
                </span>
              </button>
            );
          })}
          {tab === "configured" && lists.configured.length === 0 ? (
            <button
              type="button"
              className="gsk-card justify-center border-dashed text-[var(--gsk-text-3)]"
              onClick={() => setTab("free")}
            >
              <Plus className="size-4" />
              {t("addFirst")}
            </button>
          ) : null}
        </div>
      </section>

      {open ? (
        <ProviderDrawer
          key={open.id}
          provider={open}
          isConfigured={Boolean(configured[open.id])}
          isActive={active === open.id}
          ollamaUrl={ollamaUrl}
          tierLabel={tierLabel(open.tier)}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

function ProviderDrawer({
  provider: p,
  isConfigured,
  isActive,
  ollamaUrl,
  tierLabel,
  onClose,
}: {
  provider: CatalogEntry;
  isConfigured: boolean;
  isActive: boolean;
  ollamaUrl: string;
  tierLabel: string;
  onClose: () => void;
}) {
  const t = useTranslations("settings.aiPanel");
  const isOllama = p.id === "ollama";
  const [value, setValue] = useState(isOllama ? ollamaUrl : "");
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<
    null | { ok: true; reply: string; elapsedMs: number } | { ok: false; error: string }
  >(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    // Capture: the settings window also listens for Escape and would close.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const save = (next: string) => {
    const fd = new FormData();
    fd.set("value", next);
    startTransition(async () => {
      if (isOllama) await saveOllamaUrl(fd);
      else await saveApiKey(p.id as Provider, fd);
      setSaved(true);
      setResult(null);
      if (!isOllama) setValue("");
    });
  };

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const r = await safeFetch<{ ok: true; reply: string; elapsedMs: number }>("/api/test-provider", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: isOllama ? "ollama" : p.id }),
    });
    setResult(r.ok ? r.data : { ok: false, error: r.error });
    setTesting(false);
  };

  return createPortal(
    <>
      <div className="gsk-drawer-mask" onMouseDown={onClose} />
      <aside className="gsk-drawer" role="dialog" aria-modal="true" aria-label={p.label}>
        <header className="gsk-drawer__header">
          <span className="gsk-drawer__icon">{initials(p.label)}</span>
          <div className="min-w-0 flex-1">
            <div className="gsk-drawer__title">{p.label}</div>
            <div className="gsk-drawer__subtitle">
              {tierLabel}
              {" · "}
              {isConfigured ? t("configured") : t("notConfigured")}
              {isActive ? ` · ${t("default")}` : ""}
            </div>
          </div>
          <button type="button" className="gsk-drawer__close" aria-label={t("close")} onClick={onClose}>
            <X className="size-5" />
          </button>
        </header>

        <div className="gsk-drawer__body">
          <p className="m-0 text-[13px] leading-relaxed text-[var(--gsk-text-2)]">
            {p.description}
            {p.notes ? <span className="mt-1 block">{p.notes}</span> : null}
          </p>

          <div>
            <h4 className="gsk-section-title">{isOllama ? t("installTitle") : t("getKeyTitle")}</h4>
            <ol className="gsk-steps">
              {p.steps.map((s, i) => (
                <li key={i}>
                  <span className="gsk-steps__index">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <a href={p.keyUrl} target="_blank" rel="noreferrer" className="gsk-btn mt-3">
              {t("open", { site: p.keyUrlLabel })}
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          <div>
            <h4 className="gsk-section-title">{isOllama ? t("ollamaTitle") : t("keyTitle")}</h4>
            <label className="gsk-field-label" htmlFor="provider-key">
              {isOllama ? t("ollamaLabel") : t("keyLabel")}
            </label>
            <div className="flex gap-2">
              <input
                id="provider-key"
                type={isOllama || show ? "text" : "password"}
                value={value}
                autoComplete="off"
                onChange={(e) => {
                  setValue(e.target.value);
                  setSaved(false);
                }}
                placeholder={
                  isOllama
                    ? "http://localhost:11434"
                    : isConfigured
                      ? t("keySavedPlaceholder")
                      : p.keyPrefix
                        ? t("keyPlaceholderPrefix", { prefix: p.keyPrefix })
                        : t("keyPlaceholder")
                }
                className="gsk-input gsk-mono"
              />
              {!isOllama ? (
                <button
                  type="button"
                  className="gsk-btn px-2"
                  aria-label={show ? t("hide") : t("show")}
                  onClick={() => setShow((v) => !v)}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              ) : null}
            </div>
            <p className="gsk-help">
              {t("storageHint")} <code className="gsk-code">{p.envVar}</code>
            </p>
            {result ? (
              <p className={`gsk-result mt-3 ${result.ok ? "gsk-status-ok" : "gsk-status-error"}`}>
                {result.ok ? (
                  <>
                    <Check className="mr-1 inline size-4" />
                    {t("testOk", { ms: result.elapsedMs })}
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-1 inline size-4" />
                    {result.error}
                  </>
                )}
              </p>
            ) : null}
          </div>
        </div>

        <footer className="gsk-drawer__footer">
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <button type="button" className="gsk-btn" disabled={testing} onClick={runTest}>
                {testing ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("test")}
              </button>
            ) : null}
            {isConfigured && !isActive ? (
              <button
                type="button"
                className="gsk-btn gsk-btn--text"
                disabled={pending}
                onClick={() =>
                  startTransition(() => setActiveProvider(p.id as Provider | "ollama"))
                }
              >
                {t("makeDefault")}
              </button>
            ) : null}
            {isConfigured && !isOllama ? (
              <button
                type="button"
                className="gsk-btn gsk-btn--danger-text"
                disabled={pending}
                onClick={() => save("")}
              >
                {t("remove")}
              </button>
            ) : null}
          </div>
          <div className="gsk-drawer__footer-right">
            {saved && !pending ? (
              <span className="gsk-status-ok inline-flex items-center gap-1 text-[13px]">
                <Check className="size-4" />
                {t("saved")}
              </span>
            ) : null}
            <button type="button" className="gsk-btn" onClick={onClose}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="gsk-btn gsk-btn--primary"
              disabled={pending || (!value && !isOllama)}
              onClick={() => save(value)}
            >
              {pending ? t("saving") : t("save")}
            </button>
          </div>
        </footer>
      </aside>
    </>,
    document.body,
  );
}
