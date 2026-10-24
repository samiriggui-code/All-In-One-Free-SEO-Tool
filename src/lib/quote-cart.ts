/**
 * The client's side of a quote: what they pick in the portal, and what
 * it costs.
 *
 * The agency sends a proposal with its services and the severities it
 * covers. In the portal the client can then pick one formula (when the
 * services are alternatives), add services from the catalogue, and ask
 * for the remaining severities to be fixed too. Every change reprices
 * the quote.
 *
 * Pure, like quote.ts: the portal runs it in the browser as the client
 * clicks, and the accept action runs it again on the server from the
 * stored proposal. Only the selection travels; amounts never do, so a
 * client cannot send their own prices.
 */

import { SEVERITIES, type ScopeLine, type Severity } from "./proposal-scope";
import { priceLineFor, type PriceLine, type QuoteSettings } from "./quote";
import type { OfferSnapshot } from "./service-offers";

export type CartInput = {
  scope: ScopeLine[];
  quote: QuoteSettings;
  /** The price lines the agency wrote, including any typed by hand. */
  pricing: PriceLine[];
  /** The services the proposal sells. */
  offers: OfferSnapshot[];
  /** Catalogue services the client may add on top. */
  addons: OfferSnapshot[];
};

/** What the client picked. */
export type Cart = {
  offerIds: number[];
  severities: Severity[];
};

type PriceText = { perMonth: string; hoursAt: (hours: number, rate: number) => string };

/** What the client sees before touching anything: the quote as sent. */
export function initialCart(input: CartInput): Cart {
  const offerIds = input.quote.alternatives
    ? input.offers.slice(0, 1).map((o) => o.offerId)
    : input.offers.map((o) => o.offerId);
  return { offerIds, severities: [...input.quote.severities] };
}

/**
 * Why a selection cannot be accepted, or null when it can.
 *
 * The severities the agency included stay included: the client adds
 * work, they do not remove what the quote is built on.
 */
export function checkCart(input: CartInput, cart: Cart): "offers" | "choice" | "severities" | null {
  const known = new Set([...input.offers, ...input.addons].map((o) => o.offerId));
  if (new Set(cart.offerIds).size !== cart.offerIds.length) return "offers";
  if (cart.offerIds.some((id) => !known.has(id))) return "offers";

  if (input.quote.alternatives && input.offers.length > 0) {
    const picked = input.offers.filter((o) => cart.offerIds.includes(o.offerId));
    if (picked.length !== 1) return "choice";
  }

  if (cart.severities.some((s) => !SEVERITIES.includes(s))) return "severities";
  if (input.quote.severities.some((s) => !cart.severities.includes(s))) return "severities";

  const lines = input.pricing.filter((l) => l.offerId === undefined);
  if (cart.offerIds.length === 0 && lines.length === 0) return "offers";
  return null;
}

/** The services in the cart, proposal ones first, in their original order. */
export function cartOffers(input: CartInput, cart: Cart): OfferSnapshot[] {
  return [...input.offers, ...input.addons].filter((o) => cart.offerIds.includes(o.offerId));
}

/** The quote settings once the client's extra severities are in. */
export function cartQuote(input: CartInput, cart: Cart): QuoteSettings {
  // Kept in the canonical order so the stored quote reads the same
  // whichever box was ticked first.
  const severities = SEVERITIES.filter((s) => cart.severities.includes(s));
  return { hourlyRate: input.quote.hourlyRate, severities, alternatives: false };
}

/**
 * The price lines for a selection.
 *
 * Lines the agency typed by hand stay as they are. A service already in
 * the proposal keeps the line the agency wrote for it (they may have
 * adjusted its price); only an hourly one is repriced, because its
 * hours move with the severities. Added services are priced from the
 * catalogue.
 */
export function cartLines(input: CartInput, cart: Cart, t: PriceText): PriceLine[] {
  const quote = cartQuote(input, cart);
  const handTyped = input.pricing.filter((l) => l.offerId === undefined);
  const lines = cartOffers(input, cart).map((offer) => {
    const own = input.pricing.find((l) => l.offerId === offer.offerId);
    if (own && offer.billing !== "hourly") return own;
    const priced = priceLineFor(offer, input.scope, quote, t);
    return own ? { ...priced, label: own.label } : priced;
  });
  return [...handTyped, ...lines];
}
