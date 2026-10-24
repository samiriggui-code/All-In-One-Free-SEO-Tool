import { describe, it, expect } from "vitest";
import { deriveScope } from "./proposal-scope";
import { cartLines, cartQuote, checkCart, initialCart, type CartInput } from "./quote-cart";
import { totals } from "./quote";
import { defaultOffers, type OfferSnapshot } from "./service-offers";

const f = (type: string, severity: string) => ({ type, severity });

// Titles at 10 min: 2 critical, 1 low. Schema at 30 min: 1 medium.
const scope = deriveScope(
  [f("missing_title", "critical"), f("missing_title", "critical"), f("long_title", "low"), f("missing_schema", "medium")],
  { locale: "fr" },
);
const t = { perMonth: "par mois", hoursAt: (h: number, r: number) => `${h} h × ${r}` };

const catalogue: OfferSnapshot[] = defaultOffers("fr").map((o, i) => ({ ...o, offerId: i + 1 }));
const [audit, fixes, monthly, , , local] = catalogue;

const input = (over: Partial<CartInput> = {}): CartInput => ({
  scope,
  quote: { hourlyRate: 60, severities: ["critical", "high"] },
  pricing: [
    { label: "Audit SEO-Ready (remisé)", detail: "", amount: 800, offerId: audit.offerId },
    { label: "Frais de mise en route", detail: "", amount: 50 },
  ],
  offers: [audit, fixes],
  addons: [monthly, local],
  ...over,
});

describe("quote cart", () => {
  it("starts as the quote was sent and keeps the agency's own prices", () => {
    const i = input();
    const cart = initialCart(i);
    expect(cart).toEqual({ offerIds: [audit.offerId, fixes.offerId], severities: ["critical", "high"] });
    const lines = cartLines(i, cart, t);
    // The hand-typed line, the edited audit price, then 20 min of critical fixes → 0.5 h × 60.
    expect(lines.map((l) => l.amount)).toEqual([50, 800, 30]);
    expect(lines[1].label).toBe("Audit SEO-Ready (remisé)");
  });

  it("reprices the fixes when the client adds a severity", () => {
    const i = input();
    const cart = { ...initialCart(i), severities: ["critical" as const, "high" as const, "medium" as const] };
    // 20 min critical + 30 min medium → 1 h × 60.
    expect(cartLines(i, cart, t).at(-1)!.amount).toBe(60);
    expect(cartQuote(i, cart).severities).toEqual(["critical", "high", "medium"]);
  });

  it("adds catalogue services as monthly lines", () => {
    const i = input();
    const cart = { ...initialCart(i), offerIds: [audit.offerId, fixes.offerId, monthly.offerId] };
    expect(totals(cartLines(i, cart, t))).toEqual({ once: 880, monthly: monthly.price });
  });

  it("refuses removing an included severity, unknown services and duplicates", () => {
    const i = input();
    const cart = initialCart(i);
    expect(checkCart(i, cart)).toBeNull();
    expect(checkCart(i, { ...cart, severities: ["critical"] })).toBe("severities");
    expect(checkCart(i, { ...cart, offerIds: [999] })).toBe("offers");
    expect(checkCart(i, { ...cart, offerIds: [audit.offerId, audit.offerId] })).toBe("offers");
    // Dropping a quoted service for a cheaper add-on is not a choice the page offers.
    expect(checkCart(i, { ...cart, offerIds: [monthly.offerId] })).toBe("offers");
    expect(checkCart(i, { ...cart, offerIds: [fixes.offerId] })).toBe("offers");
  });

  it("asks for exactly one formula when they are alternatives", () => {
    const i = input({ quote: { hourlyRate: 60, severities: ["critical"], alternatives: true }, offers: [audit, monthly], addons: [local] });
    const cart = initialCart(i);
    expect(cart.offerIds).toEqual([audit.offerId]);
    expect(checkCart(i, cart)).toBeNull();
    expect(checkCart(i, { ...cart, offerIds: [audit.offerId, monthly.offerId] })).toBe("choice");
    expect(checkCart(i, { ...cart, offerIds: [local.offerId] })).toBe("choice");
    expect(checkCart(i, { ...cart, offerIds: [monthly.offerId, local.offerId] })).toBeNull();
    expect(cartQuote(i, cart).alternatives).toBe(false);
  });
});
