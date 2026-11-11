"use client";

import { useActionState } from "react";
import { Link2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { logBuiltLink, type LogLinkResult } from "./actions";

const METHODS = [
  { v: "guest_post" },
  { v: "outreach" },
  { v: "citation" },
  { v: "broken_link" },
  { v: "resource_page" },
  { v: "directory" },
  { v: "social_profile" },
  { v: "podcast" },
  { v: "interview" },
  { v: "other" },
] as const;

/**
 * Drop-in form for logging an outbound link the user just built. Lives on
 * `/backlinks/c/[clientId]` so users open it after every successful
 * link-building action. The logged entries flow into monthly reports.
 */
export function LogLinkForm({
  clientId,
  defaultTargetUrl,
}: {
  clientId: number;
  defaultTargetUrl?: string;
}) {
  const [state, formAction, pending] = useActionState<
    LogLinkResult | null,
    FormData
  >(logBuiltLink, null);
  const t = useTranslations("linksTab.backlinks.logLink");

  return (
    <form
      action={formAction}
      className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
    >
      <input type="hidden" name="clientId" value={clientId} />
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="size-4 text-emerald-300" />
          {t("title")}
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {t("intro")}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="sourceUrl" className="text-xs">
            {t("sourceUrl")}
          </Label>
          <input
            id="sourceUrl"
            name="sourceUrl"
            required
            placeholder={t("sourceUrlPlaceholder")}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="targetUrl" className="text-xs">
            {t("targetUrl")}
          </Label>
          <input
            id="targetUrl"
            name="targetUrl"
            defaultValue={defaultTargetUrl ?? ""}
            placeholder={t("targetUrlPlaceholder")}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="anchorText" className="text-xs">
            {t("anchorText")}
          </Label>
          <input
            id="anchorText"
            name="anchorText"
            placeholder={t("anchorTextPlaceholder")}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="method" className="text-xs">
            {t("method")}
          </Label>
          <select
            id="method"
            name="method"
            defaultValue="other"
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
          >
            {METHODS.map((m) => (
              <option key={m.v} value={m.v}>
                {t(`methods.${m.v}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rel" className="text-xs">
            {t("rel")}
          </Label>
          <select
            id="rel"
            name="rel"
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
          >
            <option value="">{t("relUnknown")}</option>
            <option value="dofollow">dofollow</option>
            <option value="nofollow">nofollow</option>
            <option value="ugc">ugc</option>
            <option value="sponsored">sponsored</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="domainAuthority" className="text-xs">
            {t("domainAuthority")}
          </Label>
          <input
            id="domainAuthority"
            name="domainAuthority"
            type="number"
            min={0}
            max={100}
            placeholder="42"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="placedAt" className="text-xs">
            {t("placedAt")}
          </Label>
          <input
            id="placedAt"
            name="placedAt"
            type="date"
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="notes" className="text-xs">
            {t("notes")}
          </Label>
          <input
            id="notes"
            name="notes"
            placeholder={t("notesPlaceholder")}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {state?.ok ? (
          <p className="inline-flex items-center gap-1 text-xs text-emerald-300">
            <CheckCircle2 className="size-3" /> {t("logged")}
          </p>
        ) : state && !state.ok ? (
          <p className="text-xs text-rose-300">{state.error}</p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center rounded-md bg-emerald-500/15 px-4 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {pending ? t("logging") : t("submit")}
        </button>
      </div>
    </form>
  );
}
