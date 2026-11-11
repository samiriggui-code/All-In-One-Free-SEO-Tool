"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Globe, Loader2, Pencil, XCircle } from "lucide-react";
import {
  saveBrowserSettings,
  testProxies,
  type BrowserSettingsState,
  type ProxyHealthState,
} from "./browser-actions";
import { GskSheet, SheetField, SheetSwitch, ValueRow } from "./gsk-sheet";

/*
 * GsKnora's principle: values in the window, changes in a sheet. Field
 * names are unchanged (saveBrowserSettings reads them).
 */

type Initial = {
  maxConcurrency: number;
  proxies: string;
  stealth: boolean;
  cookies: string;
  cookieCount: number;
  remoteWs: string;
  disableRank: boolean;
  disableCwv: boolean;
  disableSerp: boolean;
  allowGbpScraper: boolean;
};

const LEAN = ["disableRank", "disableCwv", "disableSerp", "allowGbpScraper"] as const;

function OnOff({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return <span className={on ? "gsk-tag gsk-tag--success" : "gsk-tag gsk-tag--default"}>{on ? yes : no}</span>;
}

export function BrowserForm({ initial }: { initial: Initial }) {
  const t = useTranslations("settings.browserForm");
  const [editing, setEditing] = useState(false);
  const [health, setHealth] = useState<ProxyHealthState | null>(null);
  const [testing, startTest] = useTransition();
  const proxyCount = initial.proxies.split("\n").filter((l) => l.trim()).length;

  return (
    <>
      <section className="gsk-block">
        <div className="gsk-block-head gsk-block-head--action">
          <div>
            <h2 className="gsk-block-title">{t("runTitle")}</h2>
          </div>
          <button type="button" className="gsk-btn" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            {t("edit")}
          </button>
        </div>
        <ValueRow label={t("concurrency")} hint={t("concurrencyHint")}>
          {initial.maxConcurrency}
        </ValueRow>
        <ValueRow label={t("stealth")} hint={t("stealthHint")}>
          <OnOff on={initial.stealth} yes={t("on")} no={t("off")} />
        </ValueRow>
        <ValueRow label={t("remote")} hint={t("remoteHint")}>
          {initial.remoteWs ? (
            <span className="max-w-[260px] truncate font-mono text-[13px]">{initial.remoteWs}</span>
          ) : (
            <span className="gsk-value--muted">{t("localChrome")}</span>
          )}
        </ValueRow>
      </section>

      <section className="gsk-block">
        <div className="gsk-block-head">
          <h2 className="gsk-block-title">{t("networkTitle")}</h2>
        </div>
        <ValueRow label={t("proxies")} hint={t("proxiesSummaryHint")}>
          {proxyCount > 0 ? t("proxyCount", { count: proxyCount }) : <span className="gsk-value--muted">{t("direct")}</span>}
          {proxyCount > 0 ? (
            <button
              type="button"
              className="gsk-btn gsk-btn--sm"
              disabled={testing}
              onClick={() => {
                setHealth(null);
                startTest(async () => setHealth(await testProxies()));
              }}
            >
              {testing ? <Loader2 className="size-3 animate-spin" /> : null}
              {t("test")}
            </button>
          ) : null}
        </ValueRow>
        {health && health.ok && health.results.length > 0 ? (
          <ul className="mb-2 divide-y divide-[var(--gsk-stroke)] rounded-[3px] border border-[var(--gsk-stroke)] text-[13px]">
            {health.results.map((r) => (
              <li key={r.raw} className="flex items-center justify-between gap-3 px-3 py-2">
                <code className="gsk-mono break-all">{r.raw}</code>
                <span className={`flex shrink-0 items-center gap-1 ${r.ok ? "gsk-status-ok" : "gsk-status-error"}`}>
                  {r.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                  {r.ok ? `${r.latencyMs} ms` : (r.error?.slice(0, 60) ?? t("failed"))}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {health && !health.ok ? <p className="gsk-help gsk-status-error">{health.error}</p> : null}
        <ValueRow label={t("cookiesLabel")} hint={t("cookiesSummaryHint")}>
          {initial.cookieCount > 0 ? (
            t("cookieCount", { count: initial.cookieCount })
          ) : (
            <span className="gsk-value--muted">{t("none")}</span>
          )}
        </ValueRow>
      </section>

      <section className="gsk-block">
        <div className="gsk-block-head">
          <h2 className="gsk-block-title">{t("leanTitle")}</h2>
          <p className="gsk-block-description">{t("leanHint")}</p>
        </div>
        {LEAN.map((k) => (
          <ValueRow key={k} label={t(k)} hint={t(`${k}Hint`)}>
            <OnOff on={initial[k]} yes={t("on")} no={t("off")} />
          </ValueRow>
        ))}
      </section>

      {editing ? <BrowserSheet initial={initial} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

function BrowserSheet({ initial, onClose }: { initial: Initial; onClose: () => void }) {
  const t = useTranslations("settings.browserForm");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<BrowserSettingsState | null, FormData>(
    saveBrowserSettings,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  return (
    <GskSheet
      title={t("sheetTitle")}
      subtitle={t("sheetSubtitle")}
      icon={<Globe className="size-4" />}
      closeLabel={t("cancel")}
      onClose={onClose}
    >
      <form action={formAction} className="gsk-sheet-form">
        <div className="gsk-drawer__body">
          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("runTitle")}</h4>
            <SheetField label={t("concurrency")} htmlFor="b-conc" help={t("concurrencyHint")}>
              <input
                id="b-conc"
                type="number"
                name="maxConcurrency"
                defaultValue={initial.maxConcurrency}
                min={1}
                max={16}
                className="gsk-input w-[120px]"
              />
            </SheetField>
            <SheetSwitch label={t("stealth")} help={t("stealthHint")} name="stealth" defaultChecked={initial.stealth} />
            <SheetField label={t("remote")} htmlFor="b-remote" help={t("remoteHint")}>
              <input
                id="b-remote"
                name="remoteWs"
                type="text"
                defaultValue={initial.remoteWs}
                placeholder="wss://chrome.browserless.io?token=…"
                className="gsk-input gsk-mono"
              />
            </SheetField>
          </div>

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("networkTitle")}</h4>
            <SheetField
              label={t("proxies")}
              htmlFor="b-proxies"
              help={
                <>
                  {t("proxiesHint")} <code className="gsk-code">http://</code>{" "}
                  <code className="gsk-code">socks5://</code>
                </>
              }
            >
              <textarea
                id="b-proxies"
                name="proxies"
                defaultValue={initial.proxies}
                rows={4}
                placeholder={"http://user:pass@proxy.example.com:8080\nsocks5://mon-proxy:1080"}
                className="gsk-textarea gsk-mono"
              />
            </SheetField>
            <SheetField label={t("cookiesLabel")} htmlFor="b-cookies" help={t("cookiesHint")}>
              <textarea
                id="b-cookies"
                name="cookies"
                defaultValue={initial.cookies}
                rows={4}
                placeholder={"exemple.fr\tsession_id\tabc123\nexemple.fr: session_id=abc123; csrf=xyz"}
                className="gsk-textarea gsk-mono"
              />
            </SheetField>
          </div>

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("leanTitle")}</h4>
            <p className="gsk-help m-0">{t("leanHint")}</p>
            {LEAN.map((k) => (
              <SheetSwitch key={k} label={t(k)} help={t(`${k}Hint`)} name={k} defaultChecked={initial[k]} />
            ))}
          </div>
        </div>

        <footer className="gsk-drawer__footer">
          <p className="m-0 min-w-0 text-[13px]">
            {state && !state.ok ? (
              <span className="gsk-status-error inline-flex items-center gap-1.5">
                <AlertCircle className="size-4" />
                {state.error}
              </span>
            ) : (
              <span className="text-[var(--gsk-text-2)]">{t("footerNote")}</span>
            )}
          </p>
          <div className="gsk-drawer__footer-right">
            <button type="button" className="gsk-btn" onClick={onClose}>
              {t("cancel")}
            </button>
            <button type="submit" disabled={pending} className="gsk-btn gsk-btn--primary">
              {pending ? t("saving") : t("saveClose")}
            </button>
          </div>
        </footer>
      </form>
    </GskSheet>
  );
}
