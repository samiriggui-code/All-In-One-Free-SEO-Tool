import { describe, expect, it } from "vitest";
import auditUiEn from "../../messages/audit-ui.en.json";
import auditUiFr from "../../messages/audit-ui.fr.json";
import reportUiEn from "../../messages/report-ui.en.json";
import reportUiFr from "../../messages/report-ui.fr.json";
import { TOOL_UI_BATCHES } from "./tools-ui";

function flattenKeys(
  value: unknown,
  prefix = "",
  out: string[] = [],
): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    if (prefix) out.push(prefix);
    return out;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    flattenKeys(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function diff(en: unknown, fr: unknown) {
  const enKeys = flattenKeys(en);
  const frKeys = flattenKeys(fr);
  return {
    missingInEn: frKeys.filter((k) => !enKeys.includes(k)),
    missingInFr: enKeys.filter((k) => !frKeys.includes(k)),
  };
}

const empty = { missingInEn: [], missingInFr: [] };

describe("tools.ui, auditUi and reportUi catalogs", () => {
  it.each(TOOL_UI_BATCHES.en.map((en, i) => [i + 1, en, TOOL_UI_BATCHES.fr[i]]))(
    "tools-ui batch %i has the same keys in en and fr",
    (_i, en, fr) => {
      expect(diff(en, fr)).toEqual(empty);
    },
  );

  it("no tool slug appears in two batches", () => {
    const seen = new Map<string, number>();
    const dupes: string[] = [];
    TOOL_UI_BATCHES.en.forEach((batch, i) => {
      for (const slug of Object.keys(batch)) {
        if (seen.has(slug)) dupes.push(slug);
        seen.set(slug, i + 1);
      }
    });
    expect(dupes).toEqual([]);
  });

  it("auditUi has the same keys in en and fr", () => {
    expect(diff(auditUiEn, auditUiFr)).toEqual(empty);
  });

  it("reportUi has the same keys in en and fr", () => {
    expect(diff(reportUiEn, reportUiFr)).toEqual(empty);
  });
});
