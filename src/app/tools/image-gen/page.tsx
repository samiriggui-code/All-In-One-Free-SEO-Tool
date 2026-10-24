"use client";

import { useActionState } from "react";
import { useRunRefreshKey } from "@/components/use-run-refresh-key";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { runImageGen, type GenState } from "./actions";
import { RecentRuns } from "@/components/recent-runs";
import { AiDisclaimer } from "@/components/ai-disclaimer";

export default function ImageGenPage() {
  const t = useTranslations("tools.ui.image-gen");
  const [state, formAction, pending] = useActionState<GenState, FormData>(
    runImageGen,
    null,
  );
  const refreshKey = useRunRefreshKey(state?.ok ? state : null);

  function download() {
    if (!state?.ok) return;
    const a = document.createElement("a");
    a.href = state.dataUrl;
    const slug =
      state.prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) || "image";
    a.download = `${slug}.png`;
    a.click();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={ImageIcon}
        accent="violet"
      />

      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl space-y-3 p-5"
      >
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("prompt")}</span>
          <textarea
            name="prompt"
            required
            rows={4}
            placeholder={t("promptPlaceholder")}
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("aspect")}</span>
            <select
              name="aspect"
              defaultValue="landscape"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
            >
              <option value="landscape">{t("aspectLandscape")}</option>
              <option value="square">{t("aspectSquare")}</option>
              <option value="portrait">{t("aspectPortrait")}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("quality")}</span>
            <select
              name="quality"
              defaultValue="standard"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
            >
              <option value="standard">{t("qualityStandard")}</option>
              <option value="hd">{t("qualityHd")}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("style")}</span>
            <select
              name="style"
              defaultValue="vivid"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
            >
              <option value="vivid">{t("styleVivid")}</option>
              <option value="natural">{t("styleNatural")}</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-violet-500/15 px-5 text-sm font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("generating")}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              {t("generate")}
            </>
          )}
        </button>
        <p className="text-[11px] text-muted-foreground">
          {t("costHint")}
        </p>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <section className="glass-apple relative overflow-hidden rounded-2xl space-y-3 p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{t("generated")}</h2>
            <button
              type="button"
              onClick={download}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-500/15 px-3 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25"
            >
              <Download className="size-3" />
              {t("downloadPng")}
            </button>
          </header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.dataUrl}
            alt={state.prompt}
            className="w-full rounded-lg ring-1 ring-inset ring-white/10"
          />
          <p className="text-[11px] text-muted-foreground">
            {Math.round(state.sizeBytes / 1024)} KB
            {state.revisedPrompt && (
              <>
                {t("revisedPrompt")}
                <em>&quot;{state.revisedPrompt}&quot;</em>
              </>
            )}
          </p>
          <AiDisclaimer variant="inline" />
        </section>
      )}

      <RecentRuns toolId="image-gen" refreshKey={refreshKey} />
    </div>
  );
}
