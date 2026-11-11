"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Lightbulb, Plus, Target } from "lucide-react";
import type { MissionKind, MissionStatus } from "@/lib/mission-kinds";

// Listed here, not imported as values: a module evaluated by both the
// server graph (db/schema) and this client component sends Turbopack dev
// into a recompile-and-reload loop (see settings/appearance-form.tsx).
// The `satisfies` keeps the two lists from drifting apart.
const MISSION_KINDS = ["audit", "monitoring", "full", "redesign", "other"] as const satisfies readonly MissionKind[];
const MISSION_STATUSES = ["proposed", "active", "paused", "done", "cancelled"] as const satisfies readonly MissionStatus[];
import type { MissionSuggestion } from "@/lib/missions";
import { GskSheet, SheetField } from "@/app/settings/gsk-sheet";
import { addMission, setMissionStatus, type MissionActionResult } from "./mission-actions";

type Row = {
  id: number;
  kind: MissionKind;
  title: string;
  status: MissionStatus;
  targetStack: string | null;
  notes: string | null;
  startedAt: Date | null;
};

/**
 * Missions of a project: the list in the page, creation in a sheet (the
 * GsKnora principle used across the settings). The sheet opens on the
 * mission the audit suggests, when there is one.
 */
export function MissionsPanel({
  projectId,
  canCreate,
  suggestion,
  missions,
}: {
  projectId: number;
  canCreate: boolean;
  suggestion: MissionSuggestion | null;
  missions: Row[];
}) {
  const t = useTranslations("clientPage.missions");
  const locale = useLocale();
  const [sheetKind, setSheetKind] = useState<MissionKind | null>(null);
  const [pending, startTransition] = useTransition();
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <>
      {suggestion ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Lightbulb className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  {t("suggested", { kind: t(`kind_${suggestion.kind}`) })}
                </h2>
                <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
                  {t(`reason_${suggestion.reason}`)}
                  {suggestion.then ? ` ${t("then", { kind: t(`kind_${suggestion.then}`) })}` : ""}
                </p>
              </div>
            </div>
            <button type="button" className="gsk-btn gsk-btn--primary" onClick={() => setSheetKind(suggestion.kind)}>
              {t("propose")}
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">{t("listTitle")}</h2>
          <button
            type="button"
            className="gsk-btn"
            disabled={!canCreate}
            title={canCreate ? undefined : t("needsAudit")}
            onClick={() => setSheetKind(suggestion?.kind ?? "audit")}
          >
            <Plus className="size-4" />
            {t("add")}
          </button>
        </header>
        {missions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {canCreate ? t("empty") : t("needsAudit")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {missions.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Target className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t(`kind_${m.kind}`)}
                    {m.targetStack ? ` · ${m.targetStack}` : ""}
                    {m.startedAt ? ` · ${t("since", { date: fmt.format(m.startedAt) })}` : ""}
                  </p>
                </div>
                <select
                  aria-label={t("status")}
                  className="gsk-select"
                  style={{ width: 150 }}
                  value={m.status}
                  disabled={pending}
                  onChange={(e) => startTransition(() => setMissionStatus(m.id, e.target.value))}
                >
                  {MISSION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`status_${s}`)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sheetKind ? (
        <MissionSheet projectId={projectId} initialKind={sheetKind} onClose={() => setSheetKind(null)} />
      ) : null}
    </>
  );
}

function MissionSheet({
  projectId,
  initialKind,
  onClose,
}: {
  projectId: number;
  initialKind: MissionKind;
  onClose: () => void;
}) {
  const t = useTranslations("clientPage.missions");
  const router = useRouter();
  const [kind, setKind] = useState<MissionKind>(initialKind);
  const [title, setTitle] = useState(t(`kind_${initialKind}`));
  const [state, formAction, pending] = useActionState<MissionActionResult | null, FormData>(addMission, null);

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
      icon={<Target className="size-4" />}
      closeLabel={t("cancel")}
      onClose={onClose}
    >
      <form action={formAction} className="gsk-sheet-form">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="kind" value={kind} />
        <div className="gsk-drawer__body">
          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("kindTitle")}</h4>
            <div className="grid gap-2">
              {MISSION_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  className={kind === k ? "gsk-card gsk-card--on gsk-card--selected" : "gsk-card"}
                  onClick={() => {
                    // Keep a title the user typed; replace an untouched default.
                    if (title === t(`kind_${kind}`)) setTitle(t(`kind_${k}`));
                    setKind(k);
                  }}
                >
                  <span className="gsk-card__body">
                    <span className="gsk-card__title block">{t(`kind_${k}`)}</span>
                    <span className="gsk-card__subtitle">{t(`kind_${k}_hint`)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("detailsTitle")}</h4>
            <SheetField label={t("titleLabel")} htmlFor="m-title">
              <input
                id="m-title"
                name="title"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="gsk-input"
              />
            </SheetField>
            {kind === "redesign" ? (
              <SheetField label={t("stackLabel")} htmlFor="m-stack" help={t("stackHint")}>
                <input
                  id="m-stack"
                  name="targetStack"
                  maxLength={120}
                  placeholder="Next.js, WordPress, Shopify…"
                  className="gsk-input"
                />
              </SheetField>
            ) : null}
            <SheetField label={t("notesLabel")} htmlFor="m-notes" help={t("notesHint")}>
              <textarea id="m-notes" name="notes" rows={4} maxLength={2000} className="gsk-textarea" />
            </SheetField>
            {state && !state.ok ? (
              <p className="gsk-help gsk-status-error m-0 inline-flex items-center gap-1.5">
                <AlertCircle className="size-4" />
                {t(state.error === "needs_audit" ? "needsAudit" : "invalid")}
              </p>
            ) : null}
          </div>
        </div>
        <footer className="gsk-drawer__footer">
          <span className="text-[13px] text-[var(--gsk-text-2)]">{t("footer")}</span>
          <div className="gsk-drawer__footer-right">
            <button type="button" className="gsk-btn" onClick={onClose}>
              {t("cancel")}
            </button>
            <button type="submit" disabled={pending} className="gsk-btn gsk-btn--primary">
              {pending ? t("saving") : t("create")}
            </button>
          </div>
        </footer>
      </form>
    </GskSheet>
  );
}
