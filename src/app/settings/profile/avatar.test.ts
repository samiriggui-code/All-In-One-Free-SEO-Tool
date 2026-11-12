import { describe, expect, it } from "vitest";
import { AVATAR_MAX_CHARS, avatarVersion, isValidAvatar } from "./avatar";

describe("isValidAvatar", () => {
  it("accepts a small raster data URL", () => {
    expect(isValidAvatar("data:image/webp;base64,UklGRg==")).toBe(true);
    expect(isValidAvatar("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isValidAvatar("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
  });

  it("refuses SVG, external URLs and anything that is not base64", () => {
    expect(isValidAvatar("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isValidAvatar("https://example.com/me.png")).toBe(false);
    expect(isValidAvatar("data:image/png;base64,<script>")).toBe(false);
    expect(isValidAvatar("")).toBe(false);
  });

  it("refuses a picture over the size limit", () => {
    const big = "data:image/png;base64," + "A".repeat(AVATAR_MAX_CHARS);
    expect(isValidAvatar(big)).toBe(false);
  });
});

describe("avatarVersion", () => {
  it("is null without a photo and changes with the photo", () => {
    expect(avatarVersion(null)).toBeNull();
    const a = avatarVersion("data:image/png;base64,AAAA");
    const b = avatarVersion("data:image/png;base64,AAAB");
    expect(a).not.toBeNull();
    expect(a).not.toEqual(b);
  });
});
