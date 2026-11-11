"use client";

import { useActionState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createGridSchedule, type CreateScheduleResult } from "../../actions";

export function ScheduleForm({ clientId }: { clientId: number }) {
  const [state, formAction, pending] = useActionState<
    CreateScheduleResult | null,
    FormData
  >(createGridSchedule, null);
  const t = useTranslations("localTab.localGrid.scheduleForm");

  return (
    <form
      action={formAction}
      className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <CalendarPlus className="size-4 text-violet-300" />
        {t("title")}
      </h3>
      <p className="text-[11px] text-muted-foreground">
        {t("description")}
      </p>

      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-xs md:col-span-3">
          <span className="text-muted-foreground">{t("query")}</span>
          <input
            name="query"
            required
            placeholder={t("queryPlaceholder")}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("centerLat")}</span>
          <input
            name="centerLat"
            type="number"
            step="0.000001"
            required
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("centerLng")}</span>
          <input
            name="centerLng"
            type="number"
            step="0.000001"
            required
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("cadence")}</span>
          <select
            name="cadence"
            defaultValue="weekly"
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
          >
            <option value="weekly">{t("weekly")}</option>
            <option value="monthly">{t("monthly")}</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("grid")}</span>
          <select
            name="size"
            defaultValue="5"
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm"
          >
            <option value="3">3×3</option>
            <option value="5">5×5</option>
            <option value="7">7×7</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t("spacing")}</span>
          <input
            name="spacingM"
            type="number"
            min={500}
            max={10000}
            defaultValue={1500}
            step={250}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md bg-violet-500/15 px-4 text-xs font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-3 animate-spin" />
            {t("saving")}
          </>
        ) : (
          t("save")
        )}
      </button>
      {state?.ok && <p className="text-xs text-emerald-300">{t("scheduled")}</p>}
      {state && !state.ok && (
        <p className="text-xs text-rose-300">{state.error}</p>
      )}
    </form>
  );
}
