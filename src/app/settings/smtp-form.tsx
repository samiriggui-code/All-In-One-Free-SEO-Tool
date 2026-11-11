"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Mail, Pencil } from "lucide-react";
import {
  saveSmtpConfig,
  testSmtpConnection,
  sendTestEmail,
  clearSmtpConfig,
  type SaveSmtpResult,
} from "./smtp-actions";
import { GskSheet, SheetField, ValueRow } from "./gsk-sheet";

/*
 * GsKnora's principle: the window shows the current SMTP setup and the
 * checks; setting it up happens in a sheet, starting from a provider
 * preset. Same server actions and field names as before.
 */

type Initial = {
  host: string | null;
  port: string | null;
  user: string | null;
  fromEmail: string | null;
  fromName: string | null;
  secure: string | null;
  hasPassword: boolean;
};

const PRESETS = [
  { id: "gmail", label: "Gmail", host: "smtp.gmail.com", port: "587", secure: false, user: "" },
  { id: "resend", label: "Resend", host: "smtp.resend.com", port: "465", secure: true, user: "resend" },
  { id: "sendgrid", label: "SendGrid", host: "smtp.sendgrid.net", port: "587", secure: false, user: "apikey" },
] as const;

export function SmtpForm({ initial }: { initial: Initial }) {
  const t = useTranslations("settings.smtpForm");
  const [editing, setEditing] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testPending, startTest] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const configured = Boolean(initial.host);
  const empty = <span className="gsk-value--muted">{t("notSet")}</span>;

  return (
    <>
      <section className="gsk-block">
        <div className="gsk-block-head gsk-block-head--action">
          <div>
            <h2 className="gsk-block-title">{t("serverTitle")}</h2>
          </div>
          <button
            type="button"
            className={configured ? "gsk-btn" : "gsk-btn gsk-btn--primary"}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
            {configured ? t("edit") : t("setUp")}
          </button>
        </div>
        <ValueRow label={t("server")}>
          {configured ? (
            <span className="font-mono text-[13px]">
              {initial.host}:{initial.port ?? "587"}
            </span>
          ) : (
            empty
          )}
        </ValueRow>
        <ValueRow label={t("security")}>
          {configured ? (initial.secure === "true" ? t("tls") : t("starttls")) : empty}
        </ValueRow>
        <ValueRow label={t("user")}>
          {initial.user || empty}
          {initial.hasPassword ? <span className="gsk-tag gsk-tag--default">{t("passwordSaved")}</span> : null}
        </ValueRow>
        <ValueRow label={t("from")}>
          {initial.fromEmail ? (
            <span>
              {initial.fromName ? `${initial.fromName} · ` : ""}
              {initial.fromEmail}
            </span>
          ) : (
            empty
          )}
        </ValueRow>
      </section>

      {configured ? (
        <section className="gsk-block">
          <div className="gsk-block-head">
            <h2 className="gsk-block-title">{t("checkTitle")}</h2>
          </div>
          <ValueRow label={t("verify")} hint={t("verifyHint")}>
            <button
              type="button"
              className="gsk-btn"
              disabled={testPending}
              onClick={() => {
                setMsg(null);
                startTest(async () => {
                  const r = await testSmtpConnection();
                  setMsg({ ok: r.ok, text: r.ok ? t("verifyOk") : (r.error ?? t("failed")) });
                });
              }}
            >
              {t("verifyButton")}
            </button>
          </ValueRow>
          <ValueRow label={t("sendTest")} hint={t("sendTestHint")}>
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="vous@exemple.fr"
              aria-label={t("sendTestTo")}
              className="gsk-input w-[200px]"
            />
            <button
              type="button"
              className="gsk-btn"
              disabled={testPending || !testTo.trim()}
              onClick={() => {
                setMsg(null);
                startTest(async () => {
                  const r = await sendTestEmail(testTo.trim());
                  setMsg({
                    ok: r.ok,
                    text: r.ok ? t("sendTestOk", { to: testTo.trim() }) : (r.error ?? t("failed")),
                  });
                });
              }}
            >
              {t("send")}
            </button>
          </ValueRow>
          {msg ? (
            <p className={`gsk-result ${msg.ok ? "gsk-status-ok" : "gsk-status-error"}`}>
              {msg.ok ? <CheckCircle2 className="mr-1 inline size-4" /> : <AlertCircle className="mr-1 inline size-4" />}
              {msg.text}
            </p>
          ) : null}
        </section>
      ) : null}

      {editing ? <SmtpSheet initial={initial} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

function SmtpSheet({ initial, onClose }: { initial: Initial; onClose: () => void }) {
  const t = useTranslations("settings.smtpForm");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SaveSmtpResult | null, FormData>(
    saveSmtpConfig,
    null,
  );
  const errors = state && !state.ok ? state.errors : {};
  const [host, setHost] = useState(initial.host ?? "");
  const [port, setPort] = useState(initial.port ?? "587");
  const [user, setUser] = useState(initial.user ?? "");
  const [secure, setSecure] = useState(initial.secure === "true");
  const [clearing, startClear] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  const err = (k: string) => (errors[k] ? <span className="gsk-status-error">{errors[k]}</span> : undefined);

  return (
    <GskSheet
      title={t("sheetTitle")}
      subtitle={t("sheetSubtitle")}
      icon={<Mail className="size-4" />}
      closeLabel={t("cancel")}
      onClose={onClose}
    >
      <form action={formAction} className="gsk-sheet-form">
        <div className="gsk-drawer__body">
          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("step1")}</h4>
            <p className="gsk-help m-0">{t("step1Hint")}</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="gsk-btn"
                  onClick={() => {
                    setHost(p.host);
                    setPort(p.port);
                    setSecure(p.secure);
                    if (p.user) setUser(p.user);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="gsk-help m-0">{t("gmailHint")}</p>
          </div>

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("step2")}</h4>
            <div className="gsk-sheet-grid">
              <SheetField label={t("host")} htmlFor="host" help={err("host")}>
                <input
                  id="host"
                  name="host"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="gsk-input"
                />
              </SheetField>
              <SheetField label={t("port")} htmlFor="port" help={err("port")}>
                <input
                  id="port"
                  name="port"
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="gsk-input"
                />
              </SheetField>
            </div>
            <label className="gsk-sheet-switch">
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{t("tlsLabel")}</span>
                <span className="gsk-help mt-0.5 block">{t("tlsHint")}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                name="secure"
                value="true"
                checked={secure}
                onChange={(e) => setSecure(e.target.checked)}
                className="gsk-switch"
              />
            </label>
          </div>

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("step3")}</h4>
            <SheetField label={t("user")} htmlFor="user" help={err("user")}>
              <input
                id="user"
                name="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="vous@gmail.com"
                className="gsk-input"
              />
            </SheetField>
            <SheetField label={t("password")} htmlFor="password" help={err("password") ?? t("passwordHint")}>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={initial.hasPassword ? t("passwordKept") : ""}
                className="gsk-input"
              />
            </SheetField>
          </div>

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("step4")}</h4>
            <div className="gsk-sheet-grid">
              <SheetField label={t("fromEmail")} htmlFor="fromEmail" help={err("fromEmail")}>
                <input
                  id="fromEmail"
                  name="fromEmail"
                  type="email"
                  required
                  defaultValue={initial.fromEmail ?? ""}
                  placeholder="rapports@votre-agence.fr"
                  className="gsk-input"
                />
              </SheetField>
              <SheetField label={t("fromName")} htmlFor="fromName" help={err("fromName")}>
                <input
                  id="fromName"
                  name="fromName"
                  defaultValue={initial.fromName ?? ""}
                  placeholder="Mon agence SEO"
                  className="gsk-input"
                />
              </SheetField>
            </div>
          </div>
        </div>

        <footer className="gsk-drawer__footer">
          <div>
            {initial.host || initial.fromEmail ? (
              <button
                type="button"
                className="gsk-btn gsk-btn--danger-text"
                disabled={clearing}
                onClick={() =>
                  startClear(async () => {
                    await clearSmtpConfig();
                    router.refresh();
                    onClose();
                  })
                }
              >
                {t("clear")}
              </button>
            ) : null}
          </div>
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
