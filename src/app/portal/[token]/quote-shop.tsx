"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Clock, FileText, Loader2, PackagePlus, Sparkles } from "lucide-react";
import type { Severity } from "@/lib/proposal-scope";
import { bySeverity, formatDuration, totals } from "@/lib/quote";
import { cartLines, checkCart, initialCart, withOffers, type Cart, type CartInput } from "@/lib/quote-cart";
import type { OfferSnapshot } from "@/lib/service-offers";
import { acceptQuote } from "./quote-actions";
import { askPortalAssistant } from "./portal-chat";

const SEVERITY_TONE: Record<Severity, string> = {
  critical: "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-orange-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
  low: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-cyan-500/30",
};

function useMoney(currency: string) {
  const locale = useLocale();
  return (n: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${n} ${currency}`;
    }
  };
}

/**
 * The quote as a small shop: the client picks a formula, adds services
 * and severities, sees the price move, and accepts.
 */
export function QuoteShop({
  token,
  proposalId,
  title,
  intro,
  sentAt,
  currency,
  input,
}: {
  token: string;
  proposalId: number;
  title: string;
  intro: string | null;
  sentAt: string | null;
  currency: string;
  input: CartInput;
}) {
  const t = useTranslations("portal.quote");
  const tp = useTranslations("proposals");
  const money = useMoney(currency);
  const router = useRouter();
  const [cart, setCart] = useState<Cart>(() => initialCart(input));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const priceText = {
    perMonth: tp("perMonth"),
    hoursAt: (hours: number, rate: number) => tp("hoursAt", { hours, rate: money(rate) }),
  };
  // priceText only wraps translations that do not change on this page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lines = useMemo(() => cartLines(input, cart, priceText), [input, cart]);
  const sum = totals(lines);
  const rows = bySeverity(input.scope, cart.severities);
  const fixes = [...input.offers, ...input.addons].find(
    (o) => o.billing === "hourly" && cart.offerIds.includes(o.offerId),
  );
  const problem = checkCart(input, cart);
  const alternatives = Boolean(input.quote.alternatives) && input.offers.length > 1;

  /** What adding one severity would cost, with the fixes service in the cart. */
  const severityPrice = (s: Severity) => {
    if (!fixes) return 0;
    const withIt = cartLines(input, { ...cart, severities: [...cart.severities, s] }, priceText);
    return totals(withIt).once - sum.once;
  };

  const toggleOffer = (o: OfferSnapshot, on: boolean) =>
    setCart((c) =>
      withOffers(input, c, on ? [...c.offerIds, o.offerId] : c.offerIds.filter((id) => id !== o.offerId)),
    );
  const pickFormula = (o: OfferSnapshot) =>
    setCart((c) => {
      const formulaIds = new Set(input.offers.map((x) => x.offerId));
      return withOffers(input, c, [o.offerId, ...c.offerIds.filter((id) => !formulaIds.has(id))]);
    });
  const toggleSeverity = (s: Severity, on: boolean) =>
    setCart((c) => ({
      ...c,
      severities: on ? [...c.severities, s] : c.severities.filter((x) => x !== s),
    }));

  const priceOf = (o: OfferSnapshot) => {
    const line = lines.find((l) => l.offerId === o.offerId);
    if (line) return line.amount;
    // Priced as if picked, so the card shows the agency's own line (an
    // adjusted price, hours from the audit) and not the catalogue price.
    return (
      cartLines(input, { ...cart, offerIds: [...cart.offerIds, o.offerId] }, priceText).find(
        (l) => l.offerId === o.offerId,
      )?.amount ?? o.price
    );
  };

  const explain = (o: OfferSnapshot) =>
    askPortalAssistant(t("askOffer", { name: o.name }));

  const accept = () => {
    if (!window.confirm(t("confirmAccept", { amount: money(sum.once) }))) return;
    start(async () => {
      setError(null);
      const r = await acceptQuote(token, proposalId, cart);
      // No refresh here: the accepted quote leaves the page, and the
      // thank-you would go with it. The client reloads when ready.
      if (r.ok) setAccepted(true);
      else setError(t(`errors.${r.error}`));
    });
  };

  if (accepted) {
    return (
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-sm">
        <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-5" />
          {t("acceptedTitle")}
        </div>
        <p className="mt-2 text-muted-foreground">{t("acceptedBody")}</p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs ring-1 ring-inset ring-white/10 hover:bg-white/10"
        >
          {t("seeDeliverables")}
        </button>
      </section>
    );
  }

  return (
    <section id="quote" className="space-y-5 rounded-3xl border border-violet-500/20 bg-card/40 p-6 backdrop-blur-md">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">{t("eyebrow")}</div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {sentAt && <p className="text-xs text-muted-foreground">{t("sentOn", { date: sentAt })}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => askPortalAssistant(t("askQuote"))}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3 py-1.5 text-xs text-violet-700 dark:text-violet-200 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25"
          >
            <Sparkles className="size-3.5" />
            {t("explainQuote")}
          </button>
          <a
            href={`/portal/${token}/proposals/${proposalId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs ring-1 ring-inset ring-white/10 hover:bg-white/10"
          >
            <FileText className="size-3.5" />
            {t("pdf")}
          </a>
        </div>
      </header>

      {intro && <p className="whitespace-pre-line text-sm text-muted-foreground">{intro}</p>}

      {rows.some((r) => r.findings > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("findingsTitle")}</h3>
          <p className="text-xs text-muted-foreground">{fixes ? t("findingsHint") : t("findingsHintNoFixes")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {rows
              .filter((r) => r.findings > 0)
              .map((r) => {
                const locked = input.quote.severities.includes(r.severity);
                const extra = !locked && fixes ? severityPrice(r.severity) : 0;
                return (
                  <li key={r.severity} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${SEVERITY_TONE[r.severity]}`}>
                      {tp(`severity.levels.${r.severity}`)}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                      {tp("severity.row", { count: r.findings, time: formatDuration(r.minutes) })}
                    </span>
                    {locked ? (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300">{t("included")}</span>
                    ) : fixes ? (
                      <label className="flex items-center gap-1.5 text-[11px]">
                        <input
                          type="checkbox"
                          checked={cart.severities.includes(r.severity)}
                          onChange={(e) => toggleSeverity(r.severity, e.target.checked)}
                        />
                        {cart.severities.includes(r.severity) ? t("added") : t("addFor", { price: money(extra) })}
                      </label>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">{t("notIncluded")}</span>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {input.offers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{alternatives ? t("formulasPick") : t("formulas")}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {input.offers.map((o) => (
              <OfferCard
                key={o.offerId}
                currency={currency}
                offer={o}
                price={priceOf(o)}
                chosen={cart.offerIds.includes(o.offerId)}
                control={
                  alternatives ? (
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="radio"
                        name={`formula-${proposalId}`}
                        checked={cart.offerIds.includes(o.offerId)}
                        onChange={() => pickFormula(o)}
                      />
                      {t("chooseFormula")}
                    </label>
                  ) : (
                    <span className="text-xs text-emerald-700 dark:text-emerald-300">{t("inQuote")}</span>
                  )
                }
                onExplain={() => explain(o)}
              />
            ))}
          </div>
        </div>
      )}

      {input.addons.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PackagePlus className="size-4 text-cyan-700 dark:text-cyan-300" />
            {t("addons")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("addonsHint")}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {input.addons.map((o) => (
              <OfferCard
                key={o.offerId}
                currency={currency}
                offer={o}
                price={priceOf(o)}
                chosen={cart.offerIds.includes(o.offerId)}
                control={
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={cart.offerIds.includes(o.offerId)}
                      onChange={(e) => toggleOffer(o, e.target.checked)}
                    />
                    {t("addToQuote")}
                  </label>
                }
                onExplain={() => explain(o)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h3 className="text-sm font-semibold">{t("summary")}</h3>
        <ul className="divide-y divide-white/5 text-sm">
          {lines.map((l, i) => (
            <li key={`${l.offerId ?? "line"}-${i}`} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <div>{l.label}</div>
                {l.detail && <div className="text-xs text-muted-foreground">{l.detail}</div>}
              </div>
              <div className="shrink-0 tabular-nums">
                {money(l.amount)}
                {l.recurring && <span className="text-xs text-muted-foreground"> {t("perMonthShort")}</span>}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-3">
          <div className="space-y-0.5">
            <div className="text-lg font-semibold">{t("once", { amount: money(sum.once) })}</div>
            {sum.monthly > 0 && (
              <div className="text-sm text-muted-foreground">{t("monthly", { amount: money(sum.monthly) })}</div>
            )}
            <div className="text-[11px] text-muted-foreground">{tp("pricing.excludingTax")}</div>
          </div>
          <button
            type="button"
            onClick={accept}
            disabled={pending || problem !== null}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:brightness-110 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {t("accept")}
          </button>
        </div>
        {problem && <p className="text-xs text-amber-700 dark:text-amber-300">{t(`errors.${problem}`)}</p>}
        {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      </div>
    </section>
  );
}

function OfferCard({
  offer,
  price,
  chosen,
  control,
  onExplain,
  currency,
}: {
  currency: string;
  offer: OfferSnapshot;
  price: number;
  chosen: boolean;
  control: React.ReactNode;
  onExplain: () => void;
}) {
  const t = useTranslations("portal.quote");
  const money = useMoney(currency);
  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${
        chosen ? "border-violet-400/40 bg-violet-500/10" : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold">{offer.name}</h4>
        <div className="shrink-0 text-right">
          <div className="font-semibold tabular-nums">{money(price)}</div>
          <div className="text-[10px] text-muted-foreground">
            {offer.kind === "monthly" ? t("perMonthShort") : offer.billing === "hourly" ? t("onTime") : t("flat")}
          </div>
        </div>
      </div>
      {offer.summary && <p className="text-xs text-muted-foreground">{offer.summary}</p>}
      {offer.deliverables.length > 0 && (
        <ul className="space-y-1 text-xs">
          {offer.deliverables.map((d) => (
            <li key={d} className="flex gap-1.5">
              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
      {offer.duration > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          {offer.kind === "monthly"
            ? t("minMonths", { months: offer.duration })
            : t("deliveredIn", { days: offer.duration })}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {control}
        <button
          type="button"
          onClick={onExplain}
          className="inline-flex items-center gap-1 text-[11px] text-violet-700 dark:text-violet-200 hover:underline"
        >
          <Sparkles className="size-3" />
          {t("whatForMe")}
        </button>
      </div>
    </article>
  );
}
