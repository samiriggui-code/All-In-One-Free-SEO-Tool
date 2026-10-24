"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Check,
  Download,
  Loader2,
  Play,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { BatchProgress, ReviewItem } from "@/lib/report-batch";
import {
  approveReport,
  pollBatch,
  rejectReport,
  sendReport,
  startBatch,
} from "./actions";

const TEMPLATES = ["executive", "detailed", "technical"] as const;

export function BatchRunner({
  clients,
  queue,
  initialBatch,
}: {
  clients: { id: number; name: string }[];
  queue: ReviewItem[];
  initialBatch: BatchProgress | null;
}) {
  const t = useTranslations("auditUi.reports.batch");
  const [selected, setSelected] = useState<number[]>(clients.map((c) => c.id));
  const [template, setTemplate] = useState<string>("detailed");
  const [batch, setBatch] = useState<BatchProgress | null>(initialBatch);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Poll while a run is in flight. Progress lives in the database, so
  // this survives a reload — reopening the page mid-run picks it up.
  const batchId = batch?.status === "running" ? batch.id : null;
  const reloadRef = useRef(false);
  useEffect(() => {
    if (batchId === null) return;
    let live = true;
    const tick = async () => {
      const next = await pollBatch(batchId);
      if (!live) return;
      setBatch(next);
      if (next && next.status !== "running" && !reloadRef.current) {
        // The review queue is server-rendered, so it needs a refresh to
        // show the reports the run just produced.
        reloadRef.current = true;
        window.location.reload();
      }
    };
    const t = setInterval(tick, 2000);
    void tick();
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [batchId]);

  const drafts = queue.filter((q) => q.status === "draft");
  const failures = queue.filter((q) => q.status === "failed");
  const running = batch?.status === "running";

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/30">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pick and run */}
      <section className="glass-apple rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">
            {t("clientsHeading", { selected: selected.length, total: clients.length })}
          </h2>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setSelected(clients.map((c) => c.id))}
            >
              {t("selectAll")}
            </button>
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setSelected([])}
            >
              {t("clear")}
            </button>
          </div>
        </div>

        {clients.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("noClients")}
          </p>
        ) : (
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  disabled={running}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, c.id]
                        : prev.filter((id) => id !== c.id),
                    )
                  }
                />
                <span className="truncate">{c.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="template">{t("template")}</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                disabled={running}
                onClick={() => setTemplate(tpl)}
                className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${
                  template === tpl
                    ? "border-cyan-400/50 bg-cyan-500/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                }`}
              >
                <div className="font-medium">{t(`templates.${tpl}.label`)}</div>
                <div className="mt-0.5 text-muted-foreground">
                  {t(`templates.${tpl}.blurb`)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={pending || running || selected.length === 0}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await startBatch({
                  clientIds: selected,
                  template: template as "executive" | "detailed" | "technical",
                });
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                setBatch({
                  id: r.batchId,
                  status: "running",
                  total: selected.length,
                  done: 0,
                  failed: 0,
                  currentClientName: null,
                  startedAt: new Date().toISOString(),
                  finishedAt: null,
                  error: null,
                });
              })
            }
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {t("generate", { count: selected.length })}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("timing")}
          </span>
        </div>

        {batch && running && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span>
                {batch.currentClientName
                  ? t("generating", { name: batch.currentClientName })
                  : t("starting")}
              </span>
              <span className="text-muted-foreground">
                {t("progress", { done: batch.done + batch.failed, total: batch.total })}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-cyan-400 transition-all"
                style={{
                  width: `${Math.round(((batch.done + batch.failed) / Math.max(1, batch.total)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Failures first — a queue that hides the client whose report
          didn't generate is how you find out in a client meeting. */}
      {failures.length > 0 && (
        <section className="rounded-xl bg-rose-500/[0.07] p-5 ring-1 ring-inset ring-rose-500/25">
          <h2 className="text-sm font-medium text-rose-200">
            {t("failedHeading", { count: failures.length })}
          </h2>
          <ul className="mt-3 space-y-2 text-xs">
            {failures.map((f) => (
              <li key={f.id}>
                <span className="font-medium">{f.clientName}</span>
                <span className="text-muted-foreground"> — {f.error}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Review */}
      <section className="glass-apple rounded-xl p-5">
        <h2 className="text-sm font-medium">
          {t("reviewHeading", { count: drafts.length })}
        </h2>
        {drafts.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("reviewEmpty")}
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("reviewHint")}
            </p>
            <ul className="mt-4 divide-y divide-white/5">
              {drafts.map((d) => (
                <ReviewRow key={d.id} item={d} onError={setError} />
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function ReviewRow({
  item,
  onError,
}: {
  item: ReviewItem;
  onError: (e: string | null) => void;
}) {
  const t = useTranslations("auditUi.reports.batch");
  const [pending, start] = useTransition();
  const [state, setState] = useState<"draft" | "approved" | "sent" | "gone">(
    "draft",
  );
  const [opened, setOpened] = useState(false);
  if (state === "gone") return null;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.clientName}</div>
        <div className="truncate text-xs text-muted-foreground">
          {item.title}
          {item.pdfBytes
            ? ` · ${(item.pdfBytes / 1024).toFixed(0)} KB`
            : ""}
        </div>
      </div>

      <a
        href={`/api/report-archives/${item.id}/pdf`}
        target="_blank"
        rel="noreferrer"
        onClick={() => setOpened(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs hover:bg-white/10"
      >
        <Download className="size-3.5" />
        {t("open")}
      </a>

      {state === "draft" && (
        <>
          <Button
            size="sm"
            disabled={pending}
            // Not disabled on `!opened` — a hard block would be
            // patronising to someone re-sending a template they trust.
            // The nudge below is enough.
            onClick={() =>
              start(async () => {
                const r = await approveReport(item.id);
                if (r.ok) setState("approved");
                else onError(r.error ?? t("approveError"));
              })
            }
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {t("approve")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await rejectReport(item.id);
                setState("gone");
              })
            }
          >
            <X className="size-3.5" />
            {t("reject")}
          </Button>
          {!opened && (
            <span className="w-full text-[11px] text-amber-300/80">
              {t("openFirst")}
            </span>
          )}
        </>
      )}

      {state === "approved" && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await sendReport(item.id);
              if (r.ok) setState("sent");
              else onError(r.error ?? t("sendError"));
            })
          }
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {t("send")}
        </Button>
      )}

      {state === "sent" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
          <Check className="size-3" />
          {t("sent")}
        </span>
      )}
    </li>
  );
}
