"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Copy,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Tags,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getCategorySuggestions,
  getCoverImagePrompts,
} from "./actions";
import type {
  CategorySuggestion,
  ImagePromptIdea,
} from "@/lib/content-helpers";

export function ContentHelpers() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ImagePromptCard />
      <CategoryCard />
    </div>
  );
}

function ImagePromptCard() {
  const t = useTranslations("tools.ui.content-helpers");
  const tCommon = useTranslations("tools.common");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [niche, setNiche] = useState("");
  const [prompts, setPrompts] = useState<ImagePromptIdea[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    setPrompts(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("brief", brief);
    fd.set("niche", niche);
    startTransition(async () => {
      const r = await getCoverImagePrompts(fd);
      setBusy(false);
      if (r.ok) setPrompts(r.prompts);
      else setError(r.error);
    });
  }

  function copy(i: number, p: ImagePromptIdea) {
    navigator.clipboard.writeText(p.prompt).then(() => {
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  }

  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ImageIcon className="size-4 text-rose-300" />
          {t("coverTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("coverHelp")}
        </p>
      </header>
      <form onSubmit={generate} className="space-y-3 p-5">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("postTitleLabel")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={t("coverTitlePlaceholder")}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("briefLabel")}</span>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={2}
            placeholder={t("briefPlaceholder")}
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("nicheLabel")}</span>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder={t("nichePlaceholder")}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="inline-flex h-9 items-center rounded-md bg-rose-500/15 px-4 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 size-3 animate-spin" />
              {t("drafting")}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-3" />
              {t("generatePrompts")}
            </>
          )}
        </button>
      </form>
      {error && (
        <p className="mx-5 mb-4 rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {error}
        </p>
      )}
      {prompts && (
        <ul className="divide-y divide-white/[0.05]">
          {prompts.map((p, i) => (
            <li key={i} className="px-5 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-300 ring-1 ring-inset ring-rose-500/30">
                  {p.style}
                </span>
                <button
                  type="button"
                  onClick={() => copy(i, p)}
                  className="inline-flex h-7 items-center rounded-md bg-white/5 px-2 text-[11px] text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-foreground"
                >
                  {copiedIdx === i ? (
                    <>
                      <Check className="mr-1 size-3 text-emerald-300" />
                      {tCommon("copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 size-3" />
                      {tCommon("copy")}
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm leading-relaxed">{p.prompt}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryCard() {
  const t = useTranslations("tools.ui.content-helpers");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [existing, setExisting] = useState("");
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    setSuggestion(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("excerpt", excerpt);
    fd.set("existingCategories", existing);
    startTransition(async () => {
      const r = await getCategorySuggestions(fd);
      setBusy(false);
      if (r.ok) setSuggestion(r.suggestion);
      else setError(r.error);
    });
  }

  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Tags className="size-4 text-cyan-300" />
          {t("categoriesTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("categoriesHelp")}
        </p>
      </header>
      <form onSubmit={generate} className="space-y-3 p-5">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("postTitleLabel")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={t("categoryTitlePlaceholder")}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("excerptLabel")}</span>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            placeholder={t("excerptPlaceholder")}
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("existingLabel")}</span>
          <textarea
            value={existing}
            onChange={(e) => setExisting(e.target.value)}
            rows={3}
            placeholder={t("existingPlaceholder")}
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="inline-flex h-9 items-center rounded-md bg-cyan-500/15 px-4 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 size-3 animate-spin" />
              {t("suggesting")}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-3" />
              {t("suggestCategories")}
            </>
          )}
        </button>
      </form>
      {error && (
        <p className="mx-5 mb-4 rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {error}
        </p>
      )}
      {suggestion && (
        <div className="space-y-3 px-5 pb-5">
          <div className="rounded-xl bg-emerald-500/5 px-4 py-3 ring-1 ring-inset ring-emerald-500/20">
            <div className="text-[10px] uppercase tracking-wider text-emerald-300/90">
              {t("primaryCategory")}
            </div>
            <div className="mt-1 text-base font-semibold text-foreground/95">
              {suggestion.primaryCategory}
            </div>
          </div>
          {suggestion.alternateCategories.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("alternates")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.alternateCategories.map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-white/5 px-2 py-0.5 text-xs ring-1 ring-inset ring-white/10"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {suggestion.tags.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("tags")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200 ring-1 ring-inset ring-cyan-500/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {suggestion.rationale && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">{t("why")}</span>
              {suggestion.rationale}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
