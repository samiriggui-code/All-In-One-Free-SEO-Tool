"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration } from "@/lib/quote";
import {
  deleteOffer,
  loadStarterOffers,
  saveOffer,
  saveQuoteRates,
  type OfferActionResult,
} from "./actions";

type Offer = {
  id?: number;
  name: string;
  kind: "one_off" | "monthly";
  billing: "flat" | "hourly";
  summary: string;
  deliverables: string[];
  estimatedHours: number;
  duration: number;
  price: number;
  active: boolean;
};

type WorkItem = { key: string; label: string; minutesEach: number };

const fieldCls =
  "w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm outline-none focus-visible:border-ring";

const EMPTY: Offer = {
  name: "",
  kind: "one_off",
  billing: "flat",
  summary: "",
  deliverables: [],
  estimatedHours: 0,
  duration: 0,
  price: 0,
  active: true,
};

export function OffersCatalogue({
  editable,
  offers,
  hourlyRate,
  workItems,
}: {
  editable: boolean;
  offers: Offer[];
  hourlyRate: number;
  workItems: WorkItem[];
}) {
  const t = useTranslations("proposals.offers");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const run = (fn: () => Promise<OfferActionResult>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(t(`errors.${r.error}`));
      else {
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-rose-300">{error}</p>}

      <Rates editable={editable} hourlyRate={hourlyRate} workItems={workItems} run={run} pending={pending} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("listTitle", { count: offers.length })}</h2>
          {editable && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
              <Plus className="size-3.5" />
              {t("add")}
            </Button>
          )}
        </div>

        {offers.length === 0 && !adding && (
          <div className="glass-apple space-y-3 rounded-xl p-5">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            {editable && (
              <Button size="sm" disabled={pending} onClick={() => run(loadStarterOffers)}>
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                {t("loadStarter")}
              </Button>
            )}
          </div>
        )}

        {adding && (
          <OfferCard
            offer={EMPTY}
            editable
            pending={pending}
            onSave={(o) => run(() => saveOffer(o), () => setAdding(false))}
            onDelete={() => setAdding(false)}
          />
        )}

        {offers.map((o) => (
          <OfferCard
            key={o.id}
            offer={o}
            editable={editable}
            pending={pending}
            onSave={(next) => run(() => saveOffer({ ...next, id: o.id }))}
            onDelete={() => {
              if (window.confirm(t("confirmDelete", { name: o.name }))) run(() => deleteOffer(o.id!));
            }}
          />
        ))}
      </section>
    </div>
  );
}

function Rates({
  editable,
  hourlyRate,
  workItems,
  run,
  pending,
}: {
  editable: boolean;
  hourlyRate: number;
  workItems: WorkItem[];
  run: (fn: () => Promise<OfferActionResult>) => void;
  pending: boolean;
}) {
  const t = useTranslations("proposals.offers");
  const [rate, setRate] = useState(hourlyRate);
  const [minutes, setMinutes] = useState<Record<string, number>>(
    Object.fromEntries(workItems.map((w) => [w.key, w.minutesEach])),
  );

  return (
    <section className="glass-apple space-y-4 rounded-xl p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4 text-violet-300" />
          {t("ratesTitle")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("ratesHint")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="hourly-rate">{t("hourlyRate")}</Label>
          <Input
            id="hourly-rate"
            type="number"
            min={0}
            value={rate}
            disabled={!editable}
            onChange={(e) => setRate(Math.max(0, Math.round(Number(e.target.value) || 0)))}
            className="w-32"
          />
        </div>
        <p className="pb-2 text-xs text-muted-foreground">{t("dayRate", { amount: rate * 7 })}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium">{t("minutesTitle")}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {workItems.map((w) => (
            <li key={w.key} className="flex items-center gap-2 rounded-lg border border-white/5 px-3 py-1.5">
              <span className="min-w-0 flex-1 text-xs">{w.label}</span>
              <Input
                type="number"
                min={0}
                step={5}
                aria-label={t("minutesFor", { label: w.label })}
                value={minutes[w.key] ?? 0}
                disabled={!editable}
                onChange={(e) =>
                  setMinutes((m) => ({ ...m, [w.key]: Math.max(0, Math.round(Number(e.target.value) || 0)) }))
                }
                className="h-8 w-20"
              />
              <span className="w-16 text-right text-[11px] text-muted-foreground">
                {formatDuration(minutes[w.key] ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {editable && (
        <Button size="sm" disabled={pending} onClick={() => run(() => saveQuoteRates({ hourlyRate: rate, minutes }))}>
          <Save className="size-3.5" />
          {t("saveRates")}
        </Button>
      )}
    </section>
  );
}

function OfferCard({
  offer,
  editable,
  pending,
  onSave,
  onDelete,
}: {
  offer: Offer;
  editable: boolean;
  pending: boolean;
  onSave: (o: Offer) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("proposals.offers");
  const [o, setO] = useState<Offer>(offer);
  const [deliverables, setDeliverables] = useState(offer.deliverables.join("\n"));
  const set = <K extends keyof Offer>(k: K, v: Offer[K]) => setO((x) => ({ ...x, [k]: v }));
  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const id = offer.id ?? "new";

  return (
    <article className={`glass-apple space-y-3 rounded-xl p-5 ${o.active ? "" : "opacity-60"}`}>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${id}`}>{t("name")}</Label>
          <Input id={`name-${id}`} value={o.name} disabled={!editable} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`kind-${id}`}>{t("kind")}</Label>
          <select
            id={`kind-${id}`}
            value={o.kind}
            disabled={!editable}
            onChange={(e) => set("kind", e.target.value as Offer["kind"])}
            className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-2 text-sm"
          >
            <option value="one_off">{t("kinds.one_off")}</option>
            <option value="monthly">{t("kinds.monthly")}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`billing-${id}`}>{t("billing")}</Label>
          <select
            id={`billing-${id}`}
            value={o.billing}
            disabled={!editable}
            onChange={(e) => set("billing", e.target.value as Offer["billing"])}
            className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-2 text-sm"
          >
            <option value="flat">{t("billings.flat")}</option>
            <option value="hourly">{t("billings.hourly")}</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`summary-${id}`}>{t("summary")}</Label>
        <textarea
          id={`summary-${id}`}
          rows={2}
          value={o.summary}
          disabled={!editable}
          onChange={(e) => set("summary", e.target.value)}
          className={fieldCls}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`deliverables-${id}`}>{t("deliverables")}</Label>
        <textarea
          id={`deliverables-${id}`}
          rows={4}
          value={deliverables}
          disabled={!editable}
          placeholder={t("deliverablesHint")}
          onChange={(e) => setDeliverables(e.target.value)}
          className={fieldCls}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {o.billing === "flat" ? (
          <div className="space-y-1.5">
            <Label htmlFor={`price-${id}`}>
              {o.kind === "monthly" ? t("pricePerMonth") : t("price")}
            </Label>
            <Input
              id={`price-${id}`}
              type="number"
              min={0}
              value={o.price}
              disabled={!editable}
              onChange={(e) => set("price", num(e.target.value))}
            />
          </div>
        ) : (
          <p className="self-end pb-2 text-xs text-muted-foreground">{t("hourlyHint")}</p>
        )}
        {o.billing === "flat" && (
          <div className="space-y-1.5">
            <Label htmlFor={`hours-${id}`}>
              {o.kind === "monthly" ? t("hoursPerMonth") : t("hours")}
            </Label>
            <Input
              id={`hours-${id}`}
              type="number"
              min={0}
              value={o.estimatedHours}
              disabled={!editable}
              onChange={(e) => set("estimatedHours", num(e.target.value))}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`duration-${id}`}>
            {o.kind === "monthly" ? t("durationMonths") : t("durationDays")}
          </Label>
          <Input
            id={`duration-${id}`}
            type="number"
            min={0}
            value={o.duration}
            disabled={!editable}
            onChange={(e) => set("duration", num(e.target.value))}
          />
        </div>
      </div>

      {o.billing === "flat" && o.estimatedHours > 0 && o.price > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("effectiveRate", { rate: Math.round(o.price / o.estimatedHours) })}
        </p>
      )}

      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={pending || !o.name.trim()}
            onClick={() =>
              onSave({
                ...o,
                deliverables: deliverables
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              })
            }
          >
            <Save className="size-3.5" />
            {t("save")}
          </Button>
          {offer.id && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={o.active} onChange={(e) => set("active", e.target.checked)} />
              {t("active")}
            </label>
          )}
          <Button size="sm" variant="ghost" className="ml-auto" disabled={pending} onClick={onDelete}>
            <Trash2 className="size-3.5" />
            {offer.id ? t("delete") : t("cancel")}
          </Button>
        </div>
      )}
    </article>
  );
}
