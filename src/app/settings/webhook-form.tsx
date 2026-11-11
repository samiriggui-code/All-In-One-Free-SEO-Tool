"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, Bell, CheckCircle2, Pencil } from "lucide-react";
import { saveWebhookUrl, testWebhook, type WebhookActionResult } from "./actions";
import { GskSheet, SheetField, ValueRow } from "./gsk-sheet";

/*
 * GsKnora's principle: the window shows where notifications go and lets
 * you send a test; setting the URL happens in a sheet with the steps for
 * Slack, Discord and Teams. Same server actions as before.
 */

type Kind = "slack" | "discord" | "teams" | "generic";

// Mirror of detectKind from notifier.ts (client-safe)
function detectKind(url: string): Kind {
  if (/hooks\.slack\.com/i.test(url)) return "slack";
  if (/discord(?:app)?\.com\/api\/webhooks/i.test(url)) return "discord";
  if (/(?:office\.com|outlook\.com|webhook\.office\.com|teams\.microsoft\.com)/i.test(url)) return "teams";
  return "generic";
}

function mask(url: string) {
  try {
    const u = new URL(url);
    return `${u.host}/…${u.pathname.slice(-6)}`;
  } catch {
    return url.slice(0, 24) + "…";
  }
}

export function WebhookForm({ initialUrl }: { initialUrl: string | null }) {
  const t = useTranslations("settings.webhookForm");
  const [editing, setEditing] = useState(false);
  const [testState, testAction, testPending] = useActionState<WebhookActionResult | null, FormData>(
    testWebhook,
    null,
  );
  const kind = initialUrl ? detectKind(initialUrl) : null;

  return (
    <>
      <section className="gsk-block">
        <div className="gsk-block-head gsk-block-head--action">
          <div>
            <h2 className="gsk-block-title">{t("destTitle")}</h2>
          </div>
          <button
            type="button"
            className={initialUrl ? "gsk-btn" : "gsk-btn gsk-btn--primary"}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
            {initialUrl ? t("edit") : t("setUp")}
          </button>
        </div>
        <ValueRow label={t("service")}>
          {kind ? (
            <span className="gsk-tag gsk-tag--brand">{t(`kind_${kind}`)}</span>
          ) : (
            <span className="gsk-value--muted">{t("off")}</span>
          )}
        </ValueRow>
        <ValueRow label={t("url")}>
          {initialUrl ? (
            <span className="font-mono text-[13px]">{mask(initialUrl)}</span>
          ) : (
            <span className="gsk-value--muted">{t("notSet")}</span>
          )}
        </ValueRow>
        {initialUrl ? (
          <ValueRow label={t("test")} hint={t("testHint")}>
            <form action={testAction}>
              <input type="hidden" name="url" value={initialUrl} />
              <button type="submit" className="gsk-btn" disabled={testPending}>
                {testPending ? t("sending") : t("sendTest")}
              </button>
            </form>
          </ValueRow>
        ) : null}
        {testState ? (
          <p className={`gsk-result ${testState.ok ? "gsk-status-ok" : "gsk-status-error"}`}>
            {testState.ok ? <CheckCircle2 className="mr-1 inline size-4" /> : <AlertCircle className="mr-1 inline size-4" />}
            {testState.ok ? testState.message : testState.error}
          </p>
        ) : null}
      </section>

      {editing ? <WebhookSheet initialUrl={initialUrl} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

function WebhookSheet({ initialUrl, onClose }: { initialUrl: string | null; onClose: () => void }) {
  const t = useTranslations("settings.webhookForm");
  const router = useRouter();
  const [draft, setDraft] = useState(initialUrl ?? "");
  const [state, saveAction, pending] = useActionState<WebhookActionResult | null, FormData>(
    saveWebhookUrl,
    null,
  );
  const kind = detectKind(draft);
  const [removing, startRemove] = useTransition();

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
      icon={<Bell className="size-4" />}
      closeLabel={t("cancel")}
      onClose={onClose}
    >
      <form action={saveAction} className="gsk-sheet-form">
        <div className="gsk-drawer__body">
          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("stepsTitle")}</h4>
            <ol className="gsk-steps">
              {(["slack", "discord", "teams"] as const).map((k, i) => (
                <li key={k}>
                  <span className="gsk-steps__index">{i + 1}</span>
                  <span>
                    <strong className="font-medium text-[var(--gsk-text-1)]">{t(`kind_${k}`)}</strong> :{" "}
                    {t(`how_${k}`)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("urlTitle")}</h4>
            <SheetField
              label={t("url")}
              htmlFor="webhook-url"
              help={
                draft && kind !== "generic" ? (
                  <span className="gsk-status-ok">{t("detected", { service: t(`kind_${kind}`) })}</span>
                ) : (
                  t("urlHint")
                )
              }
            >
              <input
                id="webhook-url"
                name="url"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="https://hooks.slack.com/services/…"
                className="gsk-input gsk-mono"
              />
            </SheetField>
            {state && !state.ok ? <p className="gsk-help gsk-status-error">{state.error}</p> : null}
          </div>
        </div>

        <footer className="gsk-drawer__footer">
          <div>
            {initialUrl ? (
              <button
                type="button"
                className="gsk-btn gsk-btn--danger-text"
                disabled={pending || removing}
                onClick={() =>
                  startRemove(async () => {
                    const fd = new FormData();
                    fd.set("url", "");
                    await saveWebhookUrl(null, fd);
                    router.refresh();
                    onClose();
                  })
                }
              >
                {t("remove")}
              </button>
            ) : null}
          </div>
          <div className="gsk-drawer__footer-right">
            <button type="button" className="gsk-btn" onClick={onClose}>
              {t("cancel")}
            </button>
            <button type="submit" disabled={pending || !draft.trim()} className="gsk-btn gsk-btn--primary">
              {pending ? t("saving") : t("saveClose")}
            </button>
          </div>
        </footer>
      </form>
    </GskSheet>
  );
}
