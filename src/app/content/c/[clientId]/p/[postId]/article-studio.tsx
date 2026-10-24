"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Eye, FileText, ListTree, Loader2, Pencil, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markdownToHtml } from "@/lib/content-studio/exports/common";
import type { ContentPost } from "@/lib/content-studio/store";
import type { ContentScoreReport } from "@/lib/content-studio/seo/content-score";
import {
  deleteArticle,
  generateArticleOutline,
  saveArticleDraft,
  saveArticleOutline,
  scoreArticle,
  writeArticleDraft,
  type ContentError,
} from "../../../../actions";
import { StatusBadge, scoreTone } from "../../badges";

type Fields = {
  title: string;
  outlineText: string;
  draftMarkdown: string;
  metaTitle: string;
  metaDescription: string;
};

const textareaCls =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30";

// No typography plugin in this app, so the preview styles its own tags.
const previewCls =
  "min-h-[32rem] rounded-lg border border-white/10 p-4 text-sm leading-relaxed text-foreground/90 [&_a]:text-violet-300 [&_a]:underline [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:font-semibold [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg [&_li]:my-0.5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5";

/** How long the writer has to stop typing before we save and rescore. */
const IDLE_MS = 1500;

export function ArticleStudio({
  clientId,
  postId,
  editable,
  status: initialStatus,
  initial,
}: {
  clientId: number;
  postId: number;
  editable: boolean;
  status: ContentPost["status"];
  initial: Fields;
}) {
  const t = useTranslations("content.studio");
  const tStatus = useTranslations("content.status");
  const tErr = useTranslations("content.errors");

  const [fields, setFields] = useState<Fields>(initial);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<ContentError | null>(null);
  const [busy, setBusy] = useState<null | "outline" | "draft" | "save" | "delete">(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);

  const [report, setReport] = useState<ContentScoreReport | null>(null);
  const [scoring, startScoring] = useTransition();
  const [analysing, setAnalysing] = useState(false);

  const ids = { clientId, postId };
  const set = (k: keyof Fields) => (v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    if (k !== "outlineText") setDirty(true);
  };

  const fail = (e: ContentError) => {
    setError(e);
    setBusy(null);
  };

  // --- Plan ----------------------------------------------------------------

  const makeOutline = async () => {
    if (fields.outlineText && !window.confirm(t("confirmReplaceOutline"))) return;
    setBusy("outline");
    setError(null);
    const r = await generateArticleOutline(ids);
    if (!r.ok) return fail(r.error);
    setFields((f) => ({ ...f, outlineText: r.outlineText }));
    if (status === "outline_approved") setStatus("idea");
    setBusy(null);
  };

  const keepOutline = async (approve: boolean) => {
    setBusy("outline");
    setError(null);
    const r = await saveArticleOutline({ ...ids, text: fields.outlineText, approve });
    if (!r.ok) return fail(r.error);
    setFields((f) => ({ ...f, outlineText: r.outlineText }));
    if (approve && status === "idea") setStatus("outline_approved");
    setBusy(null);
  };

  // --- Draft ---------------------------------------------------------------

  const writeDraft = async () => {
    if (fields.draftMarkdown && !window.confirm(t("confirmReplaceDraft"))) return;
    setBusy("draft");
    setError(null);
    // The draft is written from the saved outline, so save edits first.
    if (fields.outlineText.trim()) {
      const saved = await saveArticleOutline({ ...ids, text: fields.outlineText, approve: true });
      if (!saved.ok) return fail(saved.error);
    }
    const r = await writeArticleDraft(ids);
    if (!r.ok) return fail(r.error);
    setFields((f) => ({
      ...f,
      draftMarkdown: r.draftMarkdown,
      metaTitle: r.metaTitle,
      metaDescription: r.metaDescription,
    }));
    if (status === "idea" || status === "outline_approved") setStatus("draft");
    setDirty(false);
    setSavedAt(Date.now());
    setBusy(null);
  };

  // The autosave timer reads the latest fields, not the ones it closed over.
  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const save = useCallback(async () => {
    const f = fieldsRef.current;
    setBusy((b) => b ?? "save");
    const r = await saveArticleDraft({
      ...ids,
      title: f.title,
      draftMarkdown: f.draftMarkdown,
      metaTitle: f.metaTitle,
      metaDescription: f.metaDescription,
    });
    setBusy((b) => (b === "save" ? null : b));
    if (!r.ok) return setError(r.error);
    // Only clear the flag if nothing was typed while the save was in flight.
    if (fieldsRef.current === f) setDirty(false);
    setSavedAt(r.savedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, postId]);

  // --- Score ---------------------------------------------------------------

  const rescore = useCallback(
    (markdown: string) =>
      startScoring(async () => {
        const r = await scoreArticle({ clientId, postId, markdown, fetch: false });
        if (r.ok && r.report) setReport(r.report);
      }),
    [clientId, postId],
  );

  const analyse = async (refresh: boolean) => {
    setAnalysing(true);
    setError(null);
    const r = await scoreArticle({
      clientId,
      postId,
      markdown: fieldsRef.current.draftMarkdown,
      fetch: true,
      refresh,
    });
    setAnalysing(false);
    if (!r.ok) return setError(r.error);
    setReport(r.report);
  };

  // Score on open when the top 10 is already cached from an earlier visit.
  useEffect(() => {
    if (initial.draftMarkdown) rescore(initial.draftMarkdown);
  }, [initial.draftMarkdown, rescore]);

  // Autosave and live rescore once the writer pauses.
  useEffect(() => {
    if (!dirty) return;
    const id = setTimeout(async () => {
      // Save first: the score is only kept for the draft as stored.
      if (editable) await save();
      if (report) rescore(fieldsRef.current.draftMarkdown);
    }, IDLE_MS);
    return () => clearTimeout(id);
  }, [fields, dirty, editable, save, rescore, report]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty || !editable) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty, editable]);

  const remove = async () => {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy("delete");
    const r = await deleteArticle(ids);
    if (r && !r.ok) fail(r.error);
  };

  const words = useMemo(
    () => fields.draftMarkdown.split(/\s+/).filter(Boolean).length,
    [fields.draftMarkdown],
  );
  const previewHtml = useMemo(
    () => (preview ? markdownToHtml(fields.draftMarkdown) : ""),
    [preview, fields.draftMarkdown],
  );
  // Autosave runs while the writer types, so it must not lock the inputs.
  const locked = !editable || (busy !== null && busy !== "save");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={status} label={tStatus(status)} />
        <span className="text-xs text-muted-foreground">
          {busy === "save"
            ? t("saving")
            : dirty
              ? t("unsaved")
              : savedAt
                ? t("saved")
                : null}
        </span>
        {editable && (
          <Button variant="ghost" size="sm" className="ml-auto text-rose-300" disabled={locked} onClick={remove}>
            <Trash2 />
            {t("delete")}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {tErr(error)}
        </p>
      )}

      {/* 1. Plan */}
      <section className="space-y-3 rounded-2xl border border-white/5 bg-card/40 p-5">
        <StepTitle n={1} icon={ListTree} title={t("planTitle")} hint={t("planHint")} />
        <textarea
          className={`${textareaCls} min-h-48`}
          value={fields.outlineText}
          onChange={(e) => set("outlineText")(e.target.value)}
          placeholder={t("planPlaceholder")}
          disabled={locked}
          spellCheck
        />
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={locked} onClick={makeOutline}>
              {busy === "outline" ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {fields.outlineText ? t("regenerateOutline") : t("generateOutline")}
            </Button>
            <Button
              variant="outline"
              disabled={locked || !fields.outlineText.trim()}
              onClick={() => keepOutline(status === "idea")}
            >
              <Check />
              {status === "idea" ? t("approveOutline") : t("saveOutline")}
            </Button>
          </div>
        )}
      </section>

      {/* 2. Article + score */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 rounded-2xl border border-white/5 bg-card/40 p-5">
          <StepTitle n={2} icon={FileText} title={t("draftTitle")} hint={t("draftHint")} />

          {editable && (
            <Button disabled={locked || !fields.outlineText.trim()} onClick={writeDraft}>
              {busy === "draft" ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {busy === "draft"
                ? t("writing")
                : fields.draftMarkdown
                  ? t("rewriteDraft")
                  : t("writeDraft")}
            </Button>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="title">{t("titleField")}</Label>
              <Input id="title" value={fields.title} onChange={(e) => set("title")(e.target.value)} disabled={locked} />
            </div>
            <CountedField
              id="metaTitle"
              label={t("metaTitle")}
              value={fields.metaTitle}
              max={60}
              onChange={set("metaTitle")}
              disabled={locked}
            />
            <CountedField
              id="metaDescription"
              label={t("metaDescription")}
              value={fields.metaDescription}
              max={160}
              onChange={set("metaDescription")}
              disabled={locked}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-white/10 p-0.5">
                <TabButton active={!preview} onClick={() => setPreview(false)} icon={Pencil} label={t("edit")} />
                <TabButton active={preview} onClick={() => setPreview(true)} icon={Eye} label={t("preview")} />
              </div>
              <span className="text-xs text-muted-foreground">{t("words", { count: words })}</span>
              {editable && (
                <Button variant="ghost" size="sm" className="ml-auto" disabled={locked || !dirty} onClick={() => void save()}>
                  <Save />
                  {t("save")}
                </Button>
              )}
            </div>
            {preview ? (
              <div
                className={previewCls}
                // markdownToHtml escapes the draft before adding its own tags.
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <textarea
                className={`${textareaCls} min-h-[32rem]`}
                value={fields.draftMarkdown}
                onChange={(e) => set("draftMarkdown")(e.target.value)}
                placeholder={t("draftPlaceholder")}
                disabled={locked}
                spellCheck
              />
            )}
          </div>
        </section>

        <ScorePanel
          report={report}
          analysing={analysing}
          scoring={scoring}
          hasDraft={fields.draftMarkdown.trim().length > 0}
          onAnalyse={analyse}
        />
      </div>
    </div>
  );
}

function StepTitle({
  n,
  icon: Icon,
  title,
  hint,
}: {
  n: number;
  icon: typeof FileText;
  title: string;
  hint: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-violet-500/15 text-xs text-violet-300">
          {n}
        </span>
        <Icon className="size-4 text-violet-300" />
        {title}
      </h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function CountedField({
  id,
  label,
  value,
  max,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const over = value.length > max;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className={`text-xs ${over ? "text-rose-300" : "text-muted-foreground"}`}>
          {value.length}/{max}
        </span>
      </div>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-invalid={over} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Eye;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-md bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300"
          : "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
      }
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}

function ScorePanel({
  report,
  analysing,
  scoring,
  hasDraft,
  onAnalyse,
}: {
  report: ContentScoreReport | null;
  analysing: boolean;
  scoring: boolean;
  hasDraft: boolean;
  onAnalyse: (refresh: boolean) => void;
}) {
  const t = useTranslations("content.score");
  const b = report?.breakdown;
  const missingRequired = report?.required.filter((r) => r.status === "missing") ?? [];
  const missingRecommended = report?.recommended.filter((r) => r.status === "missing") ?? [];

  return (
    <aside className="space-y-4 rounded-2xl border border-white/5 bg-card/40 p-5 lg:sticky lg:top-4 lg:self-start">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        {scoring && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>

      {!report ? (
        <p className="text-xs text-muted-foreground">{hasDraft ? t("introDraft") : t("introEmpty")}</p>
      ) : report.insufficient_data ? (
        <p className="text-xs text-amber-200">{t("insufficient", { count: report.competitor_count })}</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex size-16 items-center justify-center rounded-2xl text-2xl font-bold ring-1 ring-inset ${scoreTone(report.score)}`}
            >
              {report.score}
            </span>
            <div className="text-xs text-muted-foreground">
              <div>{t("grade", { grade: report.grade })}</div>
              <div>{t("against", { count: report.competitor_count })}</div>
              <div>{t("medianWords", { count: Math.round(report.serp_median_words) })}</div>
            </div>
          </div>
          {b && (
            <ul className="space-y-1.5 text-xs">
              <Row label={t("required")} value={`${b.required_terms.covered}/${b.required_terms.total}`} pts={b.required_terms} />
              <Row label={t("recommended")} value={`${b.recommended_terms.covered}/${b.recommended_terms.total}`} pts={b.recommended_terms} />
              <Row label={t("length")} value={`${b.word_count.actual}`} pts={b.word_count} />
              <Row label={t("headings")} value={`${b.headings.covered}/${b.headings.total}`} pts={b.headings} />
              <Row label={t("questions")} value={`${b.questions.covered}/${b.questions.total}`} pts={b.questions} />
            </ul>
          )}
          <Terms title={t("missingRequired")} terms={missingRequired.map((m) => m.term)} tone="rose" />
          <Terms title={t("missingRecommended")} terms={missingRecommended.slice(0, 15).map((m) => m.term)} tone="amber" />
          <Terms title={t("overOptimized")} terms={report.over_optimized.map((o) => o.term)} tone="amber" />
          {report.paa_questions_covered.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-medium text-foreground">{t("paa")}</h3>
              <ul className="space-y-1 text-xs">
                {report.paa_questions_covered.map((q) => (
                  <li key={q.q} className={q.covered ? "text-emerald-300" : "text-muted-foreground"}>
                    {q.covered ? "✓" : "○"} {q.q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={analysing}
        onClick={() => onAnalyse(Boolean(report))}
      >
        {analysing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {analysing ? t("analysing") : report ? t("refresh") : t("analyse")}
      </Button>
      <p className="text-[11px] text-muted-foreground">{t("note")}</p>
    </aside>
  );
}

function Row({
  label,
  value,
  pts,
}: {
  label: string;
  value: string;
  pts: { points: number; max: number };
}) {
  const ratio = pts.max > 0 ? pts.points / pts.max : 0;
  return (
    <li className="space-y-1">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {value} · {Math.round(pts.points)}/{pts.max}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </li>
  );
}

function Terms({ title, terms, tone }: { title: string; terms: string[]; tone: "rose" | "amber" }) {
  if (terms.length === 0) return null;
  const cls =
    tone === "rose"
      ? "bg-rose-500/10 text-rose-300 ring-rose-500/30"
      : "bg-amber-500/10 text-amber-300 ring-amber-500/30";
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium text-foreground">{title}</h3>
      <div className="flex flex-wrap gap-1">
        {terms.map((term) => (
          <span key={term} className={`rounded px-1.5 py-0.5 text-[11px] ring-1 ring-inset ${cls}`}>
            {term}
          </span>
        ))}
      </div>
    </div>
  );
}
