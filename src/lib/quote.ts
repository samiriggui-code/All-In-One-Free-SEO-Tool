/**
 * Turning a proposal into a quote: how much work, and what it costs.
 *
 * The work is counted, not guessed: findings the audit actually reported,
 * times a standard number of minutes per fix that the user sets. The
 * user decides which severities the quote covers (critical and high
 * first, say); the rest is still priced, as an option, so the client can
 * see what the remaining fixes would add.
 *
 * Pure functions only. The manager runs them in the browser as the user
 * edits, and the PDF runs them again on the saved values, so the two
 * cannot disagree.
 */

import { SEVERITIES, type ScopeLine, type Severity } from "./proposal-scope";
import type { OfferSnapshot } from "./service-offers";

export type QuoteSettings = {
  /** Whole currency units per hour, excluding tax. */
  hourlyRate: number;
  /** Severities whose fixes are in the quote. The rest is an option. */
  severities: Severity[];
  /**
   * The services are alternatives the client picks from ("audit only" or
   * "monthly follow-up"), not a bundle. The document then prices each
   * one on its own instead of adding them up.
   */
  alternatives?: boolean;
};

export const DEFAULT_HOURLY_RATE = 70;

export const DEFAULT_QUOTE: QuoteSettings = {
  hourlyRate: DEFAULT_HOURLY_RATE,
  severities: ["critical", "high"],
};

export type PriceLine = {
  label: string;
  detail: string;
  amount: number;
  /** Billed every month rather than once. */
  recurring?: boolean;
  /** The catalogue service this line was priced from, if any. */
  offerId?: number;
};

/** Findings of one line that fall in the given severities. */
function countIn(line: ScopeLine, severities: Severity[]): number {
  // Lines saved before severities were counted carry only a total. All
  // of it counts as in scope, which is what those documents said.
  if (!line.bySeverity) return line.findings;
  return severities.reduce((n, s) => n + (line.bySeverity?.[s] ?? 0), 0);
}

/** Minutes of work for one scope line within the given severities. */
export function lineMinutes(line: ScopeLine, severities: Severity[]): number {
  return countIn(line, severities) * (line.minutesEach ?? 0);
}

export type SeverityRow = { severity: Severity; findings: number; minutes: number; included: boolean };

/** One row per severity: how many findings, how many minutes, in or out. */
export function bySeverity(scope: ScopeLine[], included: Severity[]): SeverityRow[] {
  // Lines saved before severities were counted have no breakdown: they
  // stay out of this table rather than appearing under every level.
  const graded = scope.filter((l) => l.bySeverity);
  return SEVERITIES.map((severity) => {
    const findings = graded.reduce((n, l) => n + countIn(l, [severity]), 0);
    const minutes = graded.reduce((n, l) => n + lineMinutes(l, [severity]), 0);
    return { severity, findings, minutes, included: included.includes(severity) };
  });
}

export type Workload = {
  /** Minutes of fixes inside the chosen severities. */
  includedMinutes: number;
  /** Minutes of fixes left out, offered as an option. */
  optionMinutes: number;
};

export function workload(scope: ScopeLine[], settings: QuoteSettings): Workload {
  const all = scope.reduce((n, l) => n + lineMinutes(l, SEVERITIES), 0);
  const included = scope.reduce((n, l) => n + lineMinutes(l, settings.severities), 0);
  return { includedMinutes: included, optionMinutes: all - included };
}

/** Hours billed for a number of minutes: rounded up to the quarter hour. */
export function billableHours(minutes: number): number {
  return Math.ceil(minutes / 15) / 4;
}

/** "2 h 30", "45 min", "0 min". The same in both languages. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, "0")}`;
}

/**
 * The price line a catalogue service adds to the quote.
 *
 * A flat service costs its catalogue price. An hourly one (the fixes
 * themselves) costs the hours the audit implies, times the rate, so it
 * moves when the user changes which severities are covered.
 */
export function priceLineFor(
  offer: OfferSnapshot,
  scope: ScopeLine[],
  settings: QuoteSettings,
  t: { perMonth: string; hoursAt: (hours: number, rate: number) => string },
): PriceLine {
  if (offer.billing === "hourly") {
    const hours = billableHours(workload(scope, settings).includedMinutes);
    return {
      label: offer.name,
      detail: t.hoursAt(hours, settings.hourlyRate),
      amount: Math.round(hours * settings.hourlyRate),
      offerId: offer.offerId,
    };
  }
  return {
    label: offer.name,
    detail: offer.kind === "monthly" ? t.perMonth : "",
    amount: offer.price,
    recurring: offer.kind === "monthly",
    offerId: offer.offerId,
  };
}

/** What is due once, and what is due every month. */
export function totals(pricing: PriceLine[]): { once: number; monthly: number } {
  let once = 0;
  let monthly = 0;
  for (const p of pricing) {
    const amount = Number(p.amount) || 0;
    if (p.recurring) monthly += amount;
    else once += amount;
  }
  return { once, monthly };
}
