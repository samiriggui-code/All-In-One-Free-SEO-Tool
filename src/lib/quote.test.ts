import { describe, it, expect } from "vitest";
import { deriveScope } from "./proposal-scope";
import {
  billableHours,
  bySeverity,
  formatDuration,
  priceLineFor,
  totals,
  workload,
  type QuoteSettings,
} from "./quote";
import { defaultOffers, type OfferSnapshot } from "./service-offers";

const f = (type: string, severity: string) => ({ type, severity });

// 3 titles (10 min each): 2 critical, 1 low. 1 schema (30 min), high.
const scope = deriveScope(
  [f("missing_title", "critical"), f("missing_title", "critical"), f("long_title", "low"), f("missing_schema", "high")],
  { locale: "fr" },
);
const t = { perMonth: "par mois", hoursAt: (h: number, r: number) => `${h} h × ${r}` };

describe("quote", () => {
  it("counts findings by severity and writes French work items", () => {
    const titles = scope.find((l) => l.key === "titles")!;
    expect(titles.label).toBe("Réécrire les titres et meta descriptions");
    expect(titles.bySeverity).toEqual({ critical: 2, low: 1 });
    expect(titles.minutesEach).toBe(10);
  });

  it("uses the user's minutes per fix when given", () => {
    const custom = deriveScope([f("missing_title", "high")], { minutes: { titles: 25 } });
    expect(custom[0].minutesEach).toBe(25);
  });

  it("splits the work between included severities and the option", () => {
    const q: QuoteSettings = { hourlyRate: 60, severities: ["critical", "high"] };
    // 2 × 10 + 1 × 30 included; 1 × 10 left as an option.
    expect(workload(scope, q)).toEqual({ includedMinutes: 50, optionMinutes: 10 });
    const rows = bySeverity(scope, q.severities);
    expect(rows.find((r) => r.severity === "low")).toMatchObject({ findings: 1, minutes: 10, included: false });
  });

  it("prices time-based work in quarter hours at the hourly rate", () => {
    const hourly: OfferSnapshot = { offerId: 1, ...defaultOffers("fr")[1] };
    expect(hourly.billing).toBe("hourly");
    const line = priceLineFor(hourly, scope, { hourlyRate: 60, severities: ["critical", "high"] }, t);
    // 50 min bills as 1 h.
    expect(line.amount).toBe(60);
    expect(line.detail).toBe("1 h × 60");
    expect(billableHours(50)).toBe(1);
    expect(billableHours(61)).toBe(1.25);
  });

  it("prices a flat monthly service as a recurring line", () => {
    const monthly: OfferSnapshot = { offerId: 2, ...defaultOffers("fr")[2] };
    const line = priceLineFor(monthly, scope, { hourlyRate: 60, severities: [] }, t);
    expect(line).toMatchObject({ amount: monthly.price, recurring: true, offerId: 2 });
    expect(totals([line, { label: "Audit", detail: "", amount: 900 }])).toEqual({ once: 900, monthly: monthly.price });
  });

  it("formats durations the same in both languages", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(140)).toBe("2 h 20");
    expect(formatDuration(240)).toBe("4 h");
  });

  it("ships the same starter catalogue in both languages", () => {
    const fr = defaultOffers("fr");
    const en = defaultOffers("en");
    expect(en.length).toBe(fr.length);
    en.forEach((o, i) => {
      expect(o.kind).toBe(fr[i].kind);
      expect(o.billing).toBe(fr[i].billing);
      expect(o.price).toBe(fr[i].price);
      expect(o.deliverables.length).toBeGreaterThan(0);
    });
  });
});

describe("quote on older documents", () => {
  it("leaves lines with no severity breakdown out of the severity table", () => {
    const legacy = [{ label: "Old", detail: "", findings: 4, minutesEach: 10 }];
    expect(bySeverity(legacy, ["critical"]).every((r) => r.findings === 0)).toBe(true);
    // ...but still counts them as included work, as those documents did.
    expect(workload(legacy, { hourlyRate: 60, severities: [] }).includedMinutes).toBe(40);
  });
});
