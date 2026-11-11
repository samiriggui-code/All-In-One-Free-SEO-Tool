"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bug, Check, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { friendlyError } from "@/lib/friendly-error";
import { GskSheet } from "../gsk-sheet";

/*
 * The error log, laid out like GsKnora's tables (TenantMembers.vue): tabs
 * by source, one compact row per error, and the detail of an error in a
 * sheet (what happened, what to do, technical details, actions).
 *
 * No "open an issue on GitHub" link: it pre-filled a public issue on the
 * upstream repository with the stack trace, which can carry client URLs.
 * "Copy details" gives the same report to paste wherever it belongs.
 */

export type LoggedError = {
  id: number;
  source: "server" | "client" | "worker";
  context: string;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  occurrences: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

type Tab = "all" | LoggedError["source"];

// friendlyError's fallback for errors it does not recognise. Here the raw
// message is a better title (every unknown error would otherwise read the
// same), and the fallback's own text points at a GitHub button this screen
// does not have.
const GENERIC_TITLE = "Something went wrong";

function firstLine(message: string) {
  const line = message.split("\n")[0]!.trim();
  return line.length > 140 ? `${line.slice(0, 140)}…` : line;
}

function report(e: LoggedError): string {
  return `## Error report

**Source**: ${e.source}
**Context**: \`${e.context}\`
**Message**: ${e.message}
**Occurrences**: ${e.occurrences}
**First seen**: ${e.firstSeenAt.toISOString()}
**Last seen**: ${e.lastSeenAt.toISOString()}
${e.url ? `**URL**: \`${e.url}\`\n` : ""}${e.userAgent ? `**User agent**: \`${e.userAgent}\`\n` : ""}
${e.stack ? `\n### Stack trace\n\n\`\`\`\n${e.stack}\n\`\`\`\n` : ""}`;
}

export function ErrorLog({
  errors,
  clearResolved,
  resolve,
}: {
  errors: LoggedError[];
  clearResolved: () => Promise<void>;
  resolve: (id: number) => Promise<void>;
}) {
  const t = useTranslations("settings.errorLog");
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [clearing, startClear] = useTransition();

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }),
    [locale],
  );
  const counts = {
    all: errors.length,
    server: errors.filter((e) => e.source === "server").length,
    client: errors.filter((e) => e.source === "client").length,
    worker: errors.filter((e) => e.source === "worker").length,
  };
  const rows = tab === "all" ? errors : errors.filter((e) => e.source === tab);
  const open = errors.find((e) => e.id === openId) ?? null;

  return (
    <>
      <section className="gsk-block">
        <div className="gsk-block-head gsk-block-head--action">
          <div>
            <h2 className="gsk-block-title">{t("openTitle")}</h2>
            <p className="gsk-block-description">{t("openHint")}</p>
          </div>
          <button
            type="button"
            className="gsk-btn"
            disabled={clearing}
            onClick={() =>
              startClear(async () => {
                await clearResolved();
                router.refresh();
              })
            }
          >
            {t("clearResolved")}
          </button>
        </div>

        {errors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-[var(--gsk-stroke)] px-6 py-12 text-center">
            <CheckCircle2 className="size-6 text-[var(--gsk-text-3)]" />
            <p className="m-0 text-[15px] font-medium">{t("emptyTitle")}</p>
            <p className="m-0 max-w-md text-[13px] text-[var(--gsk-text-2)]">{t("emptyBody")}</p>
          </div>
        ) : (
          <>
            <div className="gsk-tabbar" role="tablist">
              {(["all", "server", "client", "worker"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  className="gsk-tab"
                  onClick={() => setTab(k)}
                >
                  {t(`tab_${k}`)}
                  <span className="gsk-tab__count">{counts[k]}</span>
                </button>
              ))}
            </div>

            <div className="gsk-table">
              <div className="gsk-table__head">
                <span>{t("colError")}</span>
                <span>{t("colSource")}</span>
                <span className="text-right">{t("colCount")}</span>
                <span className="text-right">{t("colLast")}</span>
              </div>
              {rows.map((e) => {
                const fe = friendlyError(e.message, e.context, e.stack ?? undefined);
                const title = fe.title === GENERIC_TITLE ? firstLine(e.message) : fe.title;
                return (
                  <button key={e.id} type="button" className="gsk-table__row" onClick={() => setOpenId(e.id)}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--gsk-text-1)]">{title}</span>
                      <span className="block truncate font-mono text-[12px] text-[var(--gsk-text-3)]">
                        {e.context}
                      </span>
                    </span>
                    <span>
                      <span className="gsk-tag gsk-tag--default">{t(`source_${e.source}`)}</span>
                    </span>
                    <span className="text-right tabular-nums">{e.occurrences}</span>
                    <span className="text-right text-[13px] text-[var(--gsk-text-2)]">
                      {fmt.format(e.lastSeenAt)}
                    </span>
                  </button>
                );
              })}
              <div className="gsk-table__foot">{t("total", { count: rows.length })}</div>
            </div>
          </>
        )}
      </section>

      {open ? (
        <ErrorSheet
          error={open}
          fmt={fmt}
          resolve={resolve}
          onClose={() => setOpenId(null)}
          onResolved={() => {
            setOpenId(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function ErrorSheet({
  error: e,
  fmt,
  resolve,
  onClose,
  onResolved,
}: {
  error: LoggedError;
  fmt: Intl.DateTimeFormat;
  resolve: (id: number) => Promise<void>;
  onClose: () => void;
  onResolved: () => void;
}) {
  const t = useTranslations("settings.errorLog");
  const fe = useMemo(() => friendlyError(e.message, e.context, e.stack ?? undefined), [e]);
  const generic = fe.title === GENERIC_TITLE;
  const title = generic ? firstLine(e.message) : fe.title;
  const explanation = generic ? t("genericWhat") : fe.explanation;
  const steps = generic ? [t("genericStep1"), t("genericStep2"), t("genericStep3")] : fe.steps;
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <GskSheet
      title={title}
      subtitle={`${t(`source_${e.source}`)} · ${t("times", { count: e.occurrences })} · ${fmt.format(e.lastSeenAt)}`}
      icon={<Bug className="size-4" />}
      closeLabel={t("close")}
      onClose={onClose}
    >
      <div className="gsk-drawer__body">
        <div className="gsk-sheet-section">
          <h4 className="gsk-section-title">{t("whatTitle")}</h4>
          <p className="m-0 text-[13px] leading-relaxed text-[var(--gsk-text-2)]">{explanation}</p>
        </div>

        <div className="gsk-sheet-section">
          <h4 className="gsk-section-title">{t("fixTitle")}</h4>
          <ol className="gsk-steps">
            {steps.map((s, i) => (
              <li key={i}>
                <span className="gsk-steps__index">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {fe.helpLink ? (
            <Link href={fe.helpLink.href} className="gsk-link self-start text-[13px]">
              {fe.helpLink.label}
              <ExternalLink className="size-3" />
            </Link>
          ) : null}
        </div>

        <div className="gsk-sheet-section">
          <h4 className="gsk-section-title">{t("techTitle")}</h4>
          <dl className="gsk-dl">
            <dt>{t("message")}</dt>
            <dd className="font-mono text-[12px]">{e.message}</dd>
            <dt>{t("context")}</dt>
            <dd className="font-mono text-[12px]">{e.context}</dd>
            {e.url ? (
              <>
                <dt>{t("url")}</dt>
                <dd className="break-all font-mono text-[12px]">{e.url}</dd>
              </>
            ) : null}
            <dt>{t("firstSeen")}</dt>
            <dd>{fmt.format(e.firstSeenAt)}</dd>
            <dt>{t("lastSeen")}</dt>
            <dd>{fmt.format(e.lastSeenAt)}</dd>
          </dl>
          {e.stack ? (
            <>
              <span className="gsk-field-label mb-0">{t("stack")}</span>
              <pre className="gsk-pre">{e.stack}</pre>
            </>
          ) : null}
        </div>
      </div>

      <footer className="gsk-drawer__footer">
        <button
          type="button"
          className="gsk-btn"
          onClick={() =>
            navigator.clipboard.writeText(report(e)).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              },
              () => undefined,
            )
          }
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("copied") : t("copy")}
        </button>
        <div className="gsk-drawer__footer-right">
          <button type="button" className="gsk-btn" onClick={onClose}>
            {t("close")}
          </button>
          <button
            type="button"
            className="gsk-btn gsk-btn--primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await resolve(e.id);
                onResolved();
              })
            }
          >
            {pending ? t("resolving") : t("resolve")}
          </button>
        </div>
      </footer>
    </GskSheet>
  );
}
