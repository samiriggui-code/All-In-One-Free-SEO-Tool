/**
 * Text size, as in GsKnora's Settings (composables/useFont.ts): small,
 * normal or large, applied with CSS `zoom` on <html>.
 *
 * Zoom rather than a root font-size: hundreds of rules here are written
 * in px (text-[13px] and the like), which a rem change never reaches, so
 * only parts of the screen would grow. GsKnora tried the variable route
 * first and switched to zoom for the same reason.
 *
 * Stored in a cookie, per browser: the root layout reads it, so the page
 * is drawn at the right size from the first paint, without a jump.
 */

export const FONT_SIZES = ["small", "normal", "large"] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const FONT_SCALES: Record<FontSize, number> = {
  small: 0.875,
  normal: 1,
  large: 1.125,
};

export const FONT_SIZE_COOKIE = "rf-font-size";

export function parseFontSize(raw: string | null | undefined): FontSize {
  return raw === "small" || raw === "large" ? raw : "normal";
}
