import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { pickLogo } from "./page-snapshot";

const head = (links: string) => load(`<html><head>${links}</head><body></body></html>`);

describe("pickLogo", () => {
  it("prefers the apple-touch-icon", () => {
    const $ = head(`<link rel="icon" href="/icon.png"><link rel="apple-touch-icon" href="/apple-icon.png">`);
    expect(pickLogo($)).toBe("/apple-icon.png");
  });

  it("takes the largest icon otherwise", () => {
    const $ = head(
      `<link rel="icon" sizes="16x16" href="/16.png"><link rel="icon" sizes="192x192" href="/192.png"><link rel="shortcut icon" href="/favicon.ico">`,
    );
    expect(pickLogo($)).toBe("/192.png");
  });

  it("returns nothing when the page declares no icon", () => {
    expect(pickLogo(head(""))).toBeUndefined();
  });
});
