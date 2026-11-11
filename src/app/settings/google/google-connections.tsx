"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { GskSheet, SheetField } from "../gsk-sheet";
import {
  clearGoogleCredentials,
  disconnectGoogleAccount,
  removeServiceAccount,
  saveGoogleCredentials,
  saveServiceAccount,
  testServiceAccount,
  type SaveCredentialsResult,
} from "./actions";

/*
 * Google, laid out like GsKnora's provider pages (WebSearchSettings.vue):
 * the window shows the two ways to connect as cards with their state;
 * each card opens a sheet with the numbered steps, the links into Google
 * Cloud, the fields and the actions. Same server actions as before.
 */

type Status = {
  connected: boolean;
  email: string | null;
  credentialsSet: boolean;
  credentialsFromEnv: boolean;
};

const LINKS = {
  serviceAccounts: "https://console.cloud.google.com/iam-admin/serviceaccounts",
  gscApi: "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com",
  dataApi: "https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com",
  adminApi: "https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com",
  newProject: "https://console.cloud.google.com/projectcreate",
  consent: "https://console.cloud.google.com/apis/credentials/consent",
  credentials: "https://console.cloud.google.com/apis/credentials",
};

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="gsk-link text-[13px]">
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const t = useTranslations("settings.google");
  const [done, setDone] = useState(false);
  return (
    <SheetField label={label}>
      <div className="flex gap-2">
        <input readOnly value={value} className="gsk-input gsk-mono" aria-label={label} />
        <button
          type="button"
          className="gsk-btn"
          onClick={() =>
            navigator.clipboard.writeText(value).then(
              () => {
                setDone(true);
                setTimeout(() => setDone(false), 1800);
              },
              () => undefined,
            )
          }
        >
          {done ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
          {done ? t("copied") : t("copy")}
        </button>
      </div>
    </SheetField>
  );
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li>
      <span className="gsk-steps__index">{n}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-[var(--gsk-text-1)]">{title}</span>
        {children ? <span className="mt-1 block">{children}</span> : null}
      </span>
    </li>
  );
}

export function GoogleConnections({
  serviceAccountEmail,
  status,
  clientId,
  hasSecret,
  redirectUri,
}: {
  serviceAccountEmail: string | null;
  status: Status;
  clientId: string | null;
  hasSecret: boolean;
  redirectUri: string;
}) {
  const t = useTranslations("settings.google");
  const [sheet, setSheet] = useState<null | "sa" | "oauth">(null);

  const oauthState = status.connected
    ? { ok: true, label: status.email ? t("connectedAs", { email: status.email }) : t("connected") }
    : status.credentialsFromEnv
      ? { ok: false, label: t("envReady") }
      : status.credentialsSet
        ? { ok: false, label: t("credentialsSaved") }
        : { ok: false, label: t("notConfigured") };

  return (
    <>
      <section className="gsk-block">
        <div className="gsk-block-head">
          <h2 className="gsk-block-title">{t("methodsTitle")}</h2>
          <p className="gsk-block-description">{t("methodsHint")}</p>
        </div>
        <div className="gsk-card-grid">
          <button
            type="button"
            className={serviceAccountEmail ? "gsk-card gsk-card--on items-start" : "gsk-card items-start"}
            onClick={() => setSheet("sa")}
          >
            <span className="gsk-card__badge" aria-hidden>
              <ShieldCheck className="size-4" />
            </span>
            <span className="gsk-card__body">
              <span className="gsk-card__header">
                <span className="gsk-card__title">{t("saTitle")}</span>
                <span className="gsk-tag gsk-tag--brand">{t("recommended")}</span>
              </span>
              <span className="gsk-card__subtitle">
                <span className={serviceAccountEmail ? "gsk-dot gsk-dot--on" : "gsk-dot"} />
                {serviceAccountEmail ? t("keySaved") : t("notConfigured")}
                <span className="gsk-card__sep">·</span>
                {t("saShort")}
              </span>
            </span>
          </button>

          <button
            type="button"
            className={status.connected ? "gsk-card gsk-card--on items-start" : "gsk-card items-start"}
            onClick={() => setSheet("oauth")}
          >
            <span className="gsk-card__badge" aria-hidden>
              <KeyRound className="size-4" />
            </span>
            <span className="gsk-card__body">
              <span className="gsk-card__header">
                <span className="gsk-card__title">{t("oauthTitle")}</span>
              </span>
              <span className="gsk-card__subtitle">
                <span className={oauthState.ok ? "gsk-dot gsk-dot--on" : "gsk-dot"} />
                <span className="truncate">{oauthState.label}</span>
                <span className="gsk-card__sep">·</span>
                {t("oauthShort")}
              </span>
            </span>
          </button>
        </div>
      </section>

      {sheet === "sa" ? (
        <ServiceAccountSheet email={serviceAccountEmail} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === "oauth" ? (
        <OAuthSheet
          status={status}
          clientId={clientId}
          hasSecret={hasSecret}
          redirectUri={redirectUri}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </>
  );
}

function ServiceAccountSheet({ email: initialEmail, onClose }: { email: string | null; onClose: () => void }) {
  const t = useTranslations("settings.google");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    { ok: boolean; error?: string; email?: string } | null,
    FormData
  >(saveServiceAccount, null);
  const [test, setTest] = useState<{ ok: boolean; detail: string } | null>(null);
  const [testing, startTest] = useTransition();
  const [removing, startRemove] = useTransition();
  const email = state?.ok ? (state.email ?? null) : initialEmail;

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <GskSheet
      title={t("saTitle")}
      subtitle={t("saSubtitle")}
      icon={<ShieldCheck className="size-4" />}
      closeLabel={t("close")}
      onClose={onClose}
    >
      <form action={formAction} className="gsk-sheet-form">
        <div className="gsk-drawer__body">
          <p className="m-0 text-[13px] leading-relaxed text-[var(--gsk-text-2)]">{t("saIntro")}</p>

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("stepsTitle")}</h4>
            <ol className="gsk-steps">
              <Step n={1} title={t("sa1")}>
                <Ext href={LINKS.serviceAccounts}>{t("openServiceAccounts")}</Ext>
              </Step>
              <Step n={2} title={t("sa2")} />
              <Step n={3} title={t("sa3")}>
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  <Ext href={LINKS.gscApi}>Search Console API</Ext>
                  <Ext href={LINKS.dataApi}>Analytics Data API</Ext>
                </span>
              </Step>
              <Step n={4} title={t("sa4")} />
              <Step n={5} title={t("sa5")} />
            </ol>
          </div>

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("keyTitle")}</h4>
            {email ? (
              <>
                <p className="gsk-help gsk-status-ok m-0 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" />
                  {t("keySaved")}
                </p>
                <CopyField label={t("saEmailLabel")} value={email} />
                <p className="gsk-help m-0">{t("saGrantHint")}</p>
                {test ? (
                  <p className={`gsk-result ${test.ok ? "gsk-status-ok" : "gsk-status-error"}`}>
                    {test.ok ? (
                      <CheckCircle2 className="mr-1 inline size-4" />
                    ) : (
                      <TriangleAlert className="mr-1 inline size-4" />
                    )}
                    {test.detail}
                  </p>
                ) : null}
              </>
            ) : (
              <SheetField
                label={t("jsonLabel")}
                htmlFor="sa-json"
                help={
                  state && !state.ok && state.error ? (
                    <span className="gsk-status-error">{state.error}</span>
                  ) : (
                    t("jsonHint")
                  )
                }
              >
                <textarea
                  id="sa-json"
                  name="json"
                  rows={6}
                  spellCheck={false}
                  placeholder='{"type":"service_account","project_id":"…","client_email":"…@….iam.gserviceaccount.com", …}'
                  className="gsk-textarea gsk-mono"
                />
              </SheetField>
            )}
          </div>
        </div>

        <footer className="gsk-drawer__footer">
          <div className="flex items-center gap-2">
            {email ? (
              <>
                <button
                  type="button"
                  className="gsk-btn"
                  disabled={testing}
                  onClick={() => startTest(async () => setTest(await testServiceAccount()))}
                >
                  {testing ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("test")}
                </button>
                <button
                  type="button"
                  className="gsk-btn gsk-btn--danger-text"
                  disabled={removing}
                  onClick={() =>
                    startRemove(async () => {
                      await removeServiceAccount();
                      router.refresh();
                      onClose();
                    })
                  }
                >
                  {t("removeKey")}
                </button>
              </>
            ) : null}
          </div>
          <div className="gsk-drawer__footer-right">
            <button type="button" className="gsk-btn" onClick={onClose}>
              {email ? t("close") : t("cancel")}
            </button>
            {!email ? (
              <button type="submit" disabled={pending} className="gsk-btn gsk-btn--primary">
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("saveKey")}
              </button>
            ) : null}
          </div>
        </footer>
      </form>
    </GskSheet>
  );
}

function OAuthSheet({
  status,
  clientId,
  hasSecret,
  redirectUri,
  onClose,
}: {
  status: Status;
  clientId: string | null;
  hasSecret: boolean;
  redirectUri: string;
  onClose: () => void;
}) {
  const t = useTranslations("settings.google");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SaveCredentialsResult | null, FormData>(
    saveGoogleCredentials,
    null,
  );
  const [busy, startBusy] = useTransition();
  const errors = state && !state.ok ? state.errors : {};
  const credsReady = status.credentialsSet || Boolean(state?.ok);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <GskSheet
      title={t("oauthTitle")}
      subtitle={t("oauthSubtitle")}
      icon={<KeyRound className="size-4" />}
      closeLabel={t("close")}
      onClose={onClose}
    >
      <form action={formAction} className="gsk-sheet-form">
        <div className="gsk-drawer__body">
          {status.credentialsFromEnv ? (
            <p className="gsk-result gsk-status-ok m-0">
              <CheckCircle2 className="mr-1 inline size-4" />
              {t("envActive")}
            </p>
          ) : (
            <p className="m-0 text-[13px] leading-relaxed text-[var(--gsk-text-2)]">{t("oauthIntro")}</p>
          )}

          {!status.credentialsFromEnv ? (
            <>
              <div className="gsk-sheet-section">
                <h4 className="gsk-section-title">{t("cloudTitle")}</h4>
                <ol className="gsk-steps">
                  <Step n={1} title={t("o1")}>
                    <Ext href={LINKS.newProject}>{t("openConsole")}</Ext>
                  </Step>
                  <Step n={2} title={t("o2")}>
                    <span className="flex flex-wrap gap-x-4 gap-y-1">
                      <Ext href={LINKS.gscApi}>Search Console API</Ext>
                      <Ext href={LINKS.dataApi}>Analytics Data API</Ext>
                      <Ext href={LINKS.adminApi}>Analytics Admin API</Ext>
                    </span>
                  </Step>
                  <Step n={3} title={t("o3")}>
                    {t("o3Detail")} <Ext href={LINKS.consent}>{t("openConsent")}</Ext>
                  </Step>
                  <Step n={4} title={t("o4")}>
                    {t("o4Detail")} <Ext href={LINKS.credentials}>{t("openCredentials")}</Ext>
                  </Step>
                </ol>
                <p className="gsk-result m-0 text-[13px]">
                  <TriangleAlert className="mr-1 inline size-4 text-[#d35a21]" />
                  {t("publishWarning")}
                </p>
                <CopyField label={t("redirectLabel")} value={redirectUri} />
              </div>

              <div className="gsk-sheet-section">
                <h4 className="gsk-section-title">{t("credsTitle")}</h4>
                <SheetField
                  label="Client ID"
                  htmlFor="clientId"
                  help={errors.clientId ? <span className="gsk-status-error">{errors.clientId}</span> : undefined}
                >
                  <input
                    id="clientId"
                    name="clientId"
                    defaultValue={clientId ?? ""}
                    placeholder="123-abc.apps.googleusercontent.com"
                    className="gsk-input gsk-mono"
                  />
                </SheetField>
                <SheetField
                  label="Client Secret"
                  htmlFor="clientSecret"
                  help={
                    errors.clientSecret ? (
                      <span className="gsk-status-error">{errors.clientSecret}</span>
                    ) : (
                      t("secretHint")
                    )
                  }
                >
                  <input
                    id="clientSecret"
                    name="clientSecret"
                    type="password"
                    autoComplete="off"
                    placeholder={hasSecret ? t("secretKept") : "GOCSPX-…"}
                    className="gsk-input gsk-mono"
                  />
                </SheetField>
                {state?.ok ? (
                  <p className="gsk-help gsk-status-ok m-0">{t("credsSaved")}</p>
                ) : null}
              </div>
            </>
          ) : null}

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("accountTitle")}</h4>
            {status.connected ? (
              <p className="gsk-help gsk-status-ok m-0 inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4" />
                {status.email ? t("connectedAs", { email: status.email }) : t("connected")}
              </p>
            ) : credsReady || status.credentialsFromEnv ? (
              <>
                <p className="gsk-help m-0">{t("connectHint")}</p>
                {/* A plain link: the OAuth flow leaves the app and comes back. */}
                <a href="/api/google/auth" className="gsk-btn gsk-btn--primary self-start">
                  {t("connectGoogle")}
                </a>
              </>
            ) : (
              <p className="gsk-help m-0">{t("saveCredsFirst")}</p>
            )}
            <p className="gsk-help m-0">{t("afterConnect")}</p>
          </div>
        </div>

        <footer className="gsk-drawer__footer">
          <div className="flex items-center gap-2">
            {status.connected ? (
              <button
                type="button"
                className="gsk-btn gsk-btn--danger-text"
                disabled={busy}
                onClick={() =>
                  startBusy(async () => {
                    await disconnectGoogleAccount();
                    router.refresh();
                  })
                }
              >
                {t("disconnect")}
              </button>
            ) : null}
            {status.credentialsSet && !status.credentialsFromEnv ? (
              <button
                type="button"
                className="gsk-btn gsk-btn--danger-text"
                disabled={busy}
                onClick={() =>
                  startBusy(async () => {
                    await clearGoogleCredentials();
                    router.refresh();
                    onClose();
                  })
                }
              >
                {t("clearCreds")}
              </button>
            ) : null}
          </div>
          <div className="gsk-drawer__footer-right">
            <button type="button" className="gsk-btn" onClick={onClose}>
              {t("close")}
            </button>
            {!status.credentialsFromEnv ? (
              <button type="submit" disabled={pending} className="gsk-btn gsk-btn--primary">
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("saveCreds")}
              </button>
            ) : null}
          </div>
        </footer>
      </form>
    </GskSheet>
  );
}
