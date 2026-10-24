"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  FileDown,
  Loader2,
  Package,
  Plus,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScopeLine, Severity } from "@/lib/proposal-scope";
import {
  DEFAULT_QUOTE,
  billableHours,
  bySeverity,
  formatDuration,
  lineMinutes,
  priceLineFor,
  totals,
  workload,
  type PriceLine,
  type QuoteSettings,
} from "@/lib/quote";
import type { OfferSnapshot } from "@/lib/service-offers";
import {
  createInvoiceFromProposal,
  createProposal,
  deleteProposal,
  updateProposal,
} from "./actions";

/**
 * A date that reads the same on the server and in the browser.
 *
 * This was `new Date(x).toLocaleDateString()`, which formats using the
 * runtime's locale and timezone — the Node process renders one string,
 * the browser renders another, and React tears the tree down with a
 * hydration mismatch (#418) on every visit to this page. Nothing looked
 * broken, which is why it survived: the page re-rendered client-side and
 * showed the right date anyway.
 *
 * ISO, in UTC, deliberately. Unambiguous to read, and identical wherever
 * it is rendered.
 */
function isoDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

/** Colour follows meaning: green is agreed, amber is waiting on them. */
const STATUS_TONE: Record<string, string> = {
  draft: "border-white/10 bg-white/5 text-muted-foreground",
  sent: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  accepted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  declined: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const SEVERITY_TONE: Record<Severity, string> = {
  critical: "text-rose-300",
  high: "text-amber-300",
  medium: "text-sky-300",
  low: "text-muted-foreground",
};

type ProposalRow = {
  id: number;
  clientId: number | null;
  prospectName: string;
  prospectUrl: string | null;
  title: string;
  intro: string | null;
  terms: string | null;
  currency: string;
  scope: ScopeLine[];
  pricing: PriceLine[];
  offers: OfferSnapshot[];
  quote: QuoteSettings | null;
  status: string;
  basedOnScore: number | null;
  createdAt: string;
  invoiceId: number | null;
};

function useMoney(currency: string) {
  const locale = useLocale();
  return (n: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${n.toLocaleString(locale)} ${currency}`;
    }
  };
}

export function ProposalsManager({
  clients,
  leads,
  proposals,
  catalogue,
}: {
  clients: { id: number; name: string }[];
  leads: { id: number; url: string; name: string | null; email: string | null; score: number | null }[];
  proposals: ProposalRow[];
  catalogue: OfferSnapshot[];
}) {
  const t = useTranslations("proposals");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<number | null>(null);

  const create = (input: { clientId?: number; leadId?: number }) =>
    start(async () => {
      setError(null);
      setNotice(null);
      const r = await createProposal(input);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.unmapped.length > 0) {
        // Surfaced rather than swallowed: if the audit produced checks
        // the scope builder doesn't know about, this proposal understates
        // the work, and the person sending it should decide what to do.
        setNotice(
          t("unmapped", {
            count: r.unmapped.length,
            types: r.unmapped.slice(0, 3).join(", ") + (r.unmapped.length > 3 ? "…" : ""),
          }),
        );
      }
      setOpenId(r.id);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      {error && (
        <p className="flex items-start gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/25">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-inset ring-amber-500/25">
          {notice}
        </p>
      )}

      <section className="glass-apple rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Plus className="size-4 text-violet-300" />
              {t("newTitle")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("newHint")}</p>
          </div>
          <Link
            href="/proposals/offers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs hover:bg-white/10"
          >
            <Package className="size-3.5" />
            {t("catalogueLink", { count: catalogue.length })}
          </Link>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="from-client">{t("fromClient")}</Label>
            <select
              id="from-client"
              disabled={pending || clients.length === 0}
              defaultValue=""
              onChange={(e) => {
                const id = Number(e.target.value);
                if (id) create({ clientId: id });
                e.target.value = "";
              }}
              className="mt-1 h-9 w-full rounded-md border border-white/10 bg-white/5 px-2 text-sm"
            >
              <option value="">{clients.length ? t("pickClient") : t("noClients")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="from-lead">{t("fromLead")}</Label>
            <select
              id="from-lead"
              disabled={pending || leads.length === 0}
              defaultValue=""
              onChange={(e) => {
                const id = Number(e.target.value);
                if (id) create({ leadId: id });
                e.target.value = "";
              }}
              className="mt-1 h-9 w-full rounded-md border border-white/10 bg-white/5 px-2 text-sm"
            >
              <option value="">{leads.length ? t("pickLead") : t("noLeads")}</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name || l.url.replace(/^https?:\/\//, "")}
                  {l.score !== null ? ` (${l.score}/100)` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="glass-apple rounded-xl p-5">
        <h2 className="text-sm font-medium">{t("listTitle", { count: proposals.length })}</h2>
        {proposals.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">{t("listEmpty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {proposals.map((p) => (
              <ProposalRowView
                key={p.id}
                proposal={p}
                catalogue={catalogue}
                open={openId === p.id}
                onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                onError={setError}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProposalRowView({
  proposal,
  catalogue,
  open,
  onToggle,
  onError,
}: {
  proposal: ProposalRow;
  catalogue: OfferSnapshot[];
  open: boolean;
  onToggle: () => void;
  onError: (m: string) => void;
}) {
  const t = useTranslations("proposals");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const [title, setTitle] = useState(proposal.title);
  const [intro, setIntro] = useState(proposal.intro ?? "");
  const [terms, setTerms] = useState(proposal.terms ?? "");
  const [currency, setCurrency] = useState(proposal.currency);
  const [scope, setScope] = useState<ScopeLine[]>(proposal.scope);
  const [quote, setQuote] = useState<QuoteSettings>(proposal.quote ?? DEFAULT_QUOTE);
  const [offers, setOffers] = useState<OfferSnapshot[]>(proposal.offers);
  const [pricing, setPricing] = useState<PriceLine[]>(proposal.pricing);
  const [saved, setSaved] = useState(false);
  const money = useMoney(currency);

  const priceText = {
    perMonth: t("perMonth"),
    hoursAt: (hours: number, rate: number) => t("hoursAt", { hours, rate: money(rate) }),
  };

  // Lines priced on time follow the scope: change a severity or a time
  // per fix and their amount moves with it. Everything else is as typed.
  const priced = useMemo(
    () =>
      pricing.map((line) => {
        const offer = offers.find((o) => o.offerId === line.offerId);
        // The label stays the user's; only the amount and its detail move.
        return offer?.billing === "hourly"
          ? { ...priceLineFor(offer, scope, quote, priceText), label: line.label }
          : line;
      }),
    // priceText only wraps t and money, which change with currency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pricing, offers, scope, quote, currency],
  );

  if (gone) return null;

  const work = workload(scope, quote);
  const rows = bySeverity(scope, quote.severities);
  const sum = totals(priced);
  const optionPrice = Math.round(billableHours(work.optionMinutes) * quote.hourlyRate);
  const available = catalogue.filter((c) => !offers.some((o) => o.offerId === c.offerId));

  const addOffer = (offerId: number) => {
    const offer = catalogue.find((c) => c.offerId === offerId);
    if (!offer) return;
    setOffers((o) => [...o, offer]);
    setPricing((p) => [...p, priceLineFor(offer, scope, quote, priceText)]);
  };
  const removeOffer = (offerId: number) => {
    setOffers((o) => o.filter((x) => x.offerId !== offerId));
    setPricing((p) => p.filter((x) => x.offerId !== offerId));
  };
  const toggleSeverity = (s: Severity) =>
    setQuote((q) => ({
      ...q,
      severities: q.severities.includes(s) ? q.severities.filter((x) => x !== s) : [...q.severities, s],
    }));

  const save = () =>
    start(async () => {
      const r = await updateProposal(proposal.id, {
        title,
        intro,
        terms,
        currency,
        scope,
        offers,
        quote,
        pricing: priced.filter((p) => p.label.trim()),
      });
      if (!r.ok) onError(r.error ?? t("saveFailed"));
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    });

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{proposal.title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {proposal.prospectName}
            {proposal.basedOnScore !== null && ` · ${proposal.basedOnScore}/100`}
            {` · ${t("scopeCount", { count: proposal.scope.length })}`}
            {` · ${isoDate(proposal.createdAt)}`}
          </div>
        </div>

        {/* Where a proposal stands. Sending it turns its weeks into tasks;
            accepting it unlocks the invoice. */}
        <select
          value={proposal.status}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as "draft" | "sent" | "accepted" | "declined";
            start(async () => {
              await updateProposal(proposal.id, { status: next });
              router.refresh();
            });
          }}
          className={`h-8 rounded-lg border px-2 text-xs ${STATUS_TONE[proposal.status] ?? STATUS_TONE.draft}`}
          title={t("statusHint")}
        >
          <option value="draft">{t("status.draft")}</option>
          <option value="sent">{t("status.sent")}</option>
          <option value="accepted">{t("status.accepted")}</option>
          <option value="declined">{t("status.declined")}</option>
        </select>

        {proposal.status === "accepted" &&
          (proposal.invoiceId ? (
            <Link
              href={`/invoices/${proposal.invoiceId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300"
            >
              <Receipt className="size-3.5" />
              {t("openInvoice")}
            </Link>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              title={proposal.clientId ? undefined : t("invoiceNeedsClient")}
              onClick={() =>
                start(async () => {
                  const r = await createInvoiceFromProposal(proposal.id);
                  if (r.ok) router.push(`/invoices/${r.invoiceId}`);
                  else onError(t(`invoiceErrors.${r.error}`));
                })
              }
            >
              <Receipt className="size-3.5" />
              {t("createInvoice")}
            </Button>
          ))}

        <a
          href={`/proposals/${proposal.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs hover:bg-white/10"
        >
          <FileDown className="size-3.5" />
          PDF
        </a>
        <Button size="sm" variant="ghost" onClick={onToggle}>
          {open ? t("close") : t("edit")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          aria-label={t("delete")}
          onClick={() => {
            if (!window.confirm(t("confirmDelete"))) return;
            start(async () => {
              const r = await deleteProposal(proposal.id);
              if (r.ok) setGone(true);
              else onError(r.error ?? t("deleteFailed"));
            });
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-5 rounded-md bg-white/5 p-4">
          <div className="space-y-1.5">
            <Label htmlFor={`t-${proposal.id}`}>{t("fields.title")}</Label>
            <Input id={`t-${proposal.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`i-${proposal.id}`}>{t("fields.intro")}</Label>
            <textarea
              id={`i-${proposal.id}`}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={4}
              placeholder={t("fields.introPlaceholder")}
              className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm"
            />
          </div>

          {/* ---- The work, counted from the audit ---- */}
          <div>
            <p className="text-xs font-medium">{t("scope.title")}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("scope.hint")}</p>
            {scope.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">{t("scope.empty")}</p>
            ) : (
              <table className="mt-2 w-full text-xs">
                <thead className="text-[11px] text-muted-foreground">
                  <tr>
                    <th className="py-1 text-left font-normal">{t("scope.work")}</th>
                    <th className="py-1 text-right font-normal">{t("scope.errors")}</th>
                    <th className="py-1 text-right font-normal">{t("scope.minutesEach")}</th>
                    <th className="py-1 text-right font-normal">{t("scope.time")}</th>
                  </tr>
                </thead>
                <tbody>
                  {scope.map((s, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="py-1.5 pr-2">{s.label}</td>
                      <td className="py-1.5 text-right tabular-nums">{s.findings}</td>
                      <td className="py-1.5 text-right">
                        <Input
                          type="number"
                          min={0}
                          step={5}
                          aria-label={t("scope.minutesFor", { label: s.label })}
                          value={s.minutesEach ?? 0}
                          onChange={(e) => {
                            const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                            setScope((all) => all.map((x, j) => (j === i ? { ...x, minutesEach: v } : x)));
                          }}
                          className="ml-auto h-7 w-20 text-right"
                        />
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                        {formatDuration(lineMinutes(s, quote.severities))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ---- Severity: what the quote covers ---- */}
          {scope.length > 0 && (
            <div>
              <p className="text-xs font-medium">{t("severity.title")}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t("severity.hint")}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-4">
                {rows.map((r) => (
                  <li key={r.severity}>
                    <label
                      className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2 text-xs ${
                        r.included ? "border-violet-400/40 bg-violet-500/10" : "border-white/10"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={r.included}
                          onChange={() => toggleSeverity(r.severity)}
                        />
                        <span className={`font-medium ${SEVERITY_TONE[r.severity]}`}>
                          {t(`severity.levels.${r.severity}`)}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {t("severity.row", { count: r.findings, time: formatDuration(r.minutes) })}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                {t("severity.included", { time: formatDuration(work.includedMinutes) })}
                {work.optionMinutes > 0 &&
                  ` · ${t("severity.option", { time: formatDuration(work.optionMinutes), price: money(optionPrice) })}`}
              </p>
            </div>
          )}

          {/* ---- Services from the catalogue ---- */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium">{t("services.title")}</p>
              <div className="flex items-center gap-2">
                <Label htmlFor={`rate-${proposal.id}`} className="text-[11px] text-muted-foreground">
                  {t("services.hourlyRate")}
                </Label>
                <Input
                  id={`rate-${proposal.id}`}
                  type="number"
                  min={0}
                  value={quote.hourlyRate}
                  onChange={(e) =>
                    setQuote((q) => ({ ...q, hourlyRate: Math.max(0, Math.round(Number(e.target.value) || 0)) }))
                  }
                  className="h-7 w-20"
                />
              </div>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("services.hint")}</p>
            {offers.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {offers.map((o) => (
                  <li
                    key={o.offerId}
                    className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{o.name}</span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {o.kind === "monthly"
                          ? t("services.monthly", { months: o.duration })
                          : t("services.oneOff", { days: o.duration })}
                        {" · "}
                        {o.billing === "hourly"
                          ? t("services.hourlyWork", { time: formatDuration(work.includedMinutes) })
                          : o.kind === "monthly"
                            ? t("services.hoursPerMonth", { hours: o.estimatedHours })
                            : t("services.hours", { hours: o.estimatedHours })}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={t("services.remove", { name: o.name })}
                      onClick={() => removeOffer(o.offerId)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <select
                value=""
                disabled={available.length === 0}
                onChange={(e) => addOffer(Number(e.target.value))}
                aria-label={t("services.add")}
                className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs"
              >
                <option value="">
                  {catalogue.length === 0 ? t("services.emptyCatalogue") : t("services.add")}
                </option>
                {available.map((c) => (
                  <option key={c.offerId} value={c.offerId}>
                    {c.name}
                  </option>
                ))}
              </select>
              {offers.length > 1 && (
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={quote.alternatives ?? false}
                    onChange={(e) => setQuote((q) => ({ ...q, alternatives: e.target.checked }))}
                  />
                  {t("services.alternatives")}
                </label>
              )}
            </div>
          </div>

          {/* ---- Price ---- */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">{t("pricing.title")}</p>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                aria-label={t("pricing.currency")}
                className="h-7 w-16 rounded border border-white/10 bg-white/5 px-2 text-center text-xs"
              />
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("pricing.hint")}</p>
            <div className="mt-2 space-y-2">
              {priced.map((line, i) => {
                const auto = offers.find((o) => o.offerId === line.offerId)?.billing === "hourly";
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Input
                      value={line.label}
                      placeholder={t("pricing.label")}
                      onChange={(e) =>
                        setPricing((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                      }
                      className="min-w-40 flex-[2]"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={line.amount}
                      disabled={auto}
                      title={auto ? line.detail : undefined}
                      onChange={(e) =>
                        setPricing((p) =>
                          p.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)),
                        )
                      }
                      className="w-28"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={line.recurring ?? false}
                        disabled={auto}
                        onChange={(e) =>
                          setPricing((p) =>
                            p.map((x, j) => (j === i ? { ...x, recurring: e.target.checked } : x)),
                          )
                        }
                      />
                      {t("pricing.monthly")}
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t("pricing.removeLine")}
                      onClick={() => {
                        if (line.offerId) removeOffer(line.offerId);
                        else setPricing((p) => p.filter((_, j) => j !== i));
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPricing((p) => [...p, { label: "", detail: "", amount: 0 }])}
              >
                <Plus className="size-3.5" /> {t("pricing.addLine")}
              </Button>
              {quote.alternatives && offers.length > 1 ? (
                <span className="text-xs text-muted-foreground">{t("pricing.alternativesTotal")}</span>
              ) : (
                <span className="text-sm font-medium tabular-nums">
                  {sum.once > 0 && t("pricing.once", { amount: money(sum.once) })}
                  {sum.once > 0 && sum.monthly > 0 && " · "}
                  {sum.monthly > 0 && t("pricing.monthlyTotal", { amount: money(sum.monthly) })}
                  {sum.once === 0 && sum.monthly === 0 && money(0)}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{t("pricing.excludingTax")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`terms-${proposal.id}`}>{t("fields.terms")}</Label>
            <textarea
              id={`terms-${proposal.id}`}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              placeholder={t("fields.termsPlaceholder")}
              className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" disabled={pending} onClick={save}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {saved ? t("saved") : t("save")}
            </Button>
            <span className="text-xs text-muted-foreground">{t("checkPdf")}</span>
          </div>
        </div>
      )}
    </li>
  );
}

