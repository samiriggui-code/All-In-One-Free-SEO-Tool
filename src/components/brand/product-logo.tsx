import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The product's own logo. The mark is the start of the tag, `</`: a white
 * chevron and a slash in the app's blue that rises into an arrow (code,
 * and a ranking that climbs). It is drawn with plain shapes, no text, so
 * it stays sharp at 16 px in a browser tab. The name is written as a tag,
 * `<rank_forge/>`, bold, with the brackets and "forge" in the brand blue.
 *
 * public/icon.svg, icon-192.png, icon-512.png, icon.ico and
 * src/app/favicon.ico are the same mark: change them together.
 */

/** The product's name, written as it appears in the tag. */
export const PRODUCT_NAME = "rank_forge";

/**
 * The app's own blue, from `--primary` in globals.css (light, then dark
 * theme), with a lighter cyan to finish the gradient.
 */
export const BRAND_GRADIENT = ["#0b7fae", "#14b3e0", "#6fe3ff"] as const;
export const INK = "#0b0d14";

export function ProductMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor={BRAND_GRADIENT[0]} />
          <stop offset="0.55" stopColor={BRAND_GRADIENT[1]} />
          <stop offset="1" stopColor={BRAND_GRADIENT[2]} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={INK} />
      <path
        d="M19.5 13 8.5 24l11 11"
        fill="none"
        stroke="#fff"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24.5 37 35 15.5" fill="none" stroke={`url(#${id})`} strokeWidth="5.2" strokeLinecap="round" />
      <path
        d="M30.1 14.2 37.6 10.1 39.1 18.6Z"
        fill={BRAND_GRADIENT[2]}
        stroke={BRAND_GRADIENT[2]}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * `<rank_forge/>` in bold monospace: brackets and "_forge" in the brand
 * blue, "rank" in the text colour.
 */
export function ProductWordmark({
  className,
  tone = "dark",
}: {
  className?: string;
  /** The background it sits on; "auto" follows the light / dark theme. */
  tone?: "dark" | "light" | "auto";
}) {
  const [first, second] = PRODUCT_NAME.split("_");
  // On a dark ground the lighter blues carry; on a light one the deep blue.
  const onDark = { tag: BRAND_GRADIENT[1], forge: BRAND_GRADIENT[2] };
  const onLight = { tag: BRAND_GRADIENT[0], forge: BRAND_GRADIENT[0] };
  const nameClass =
    tone === "dark" ? "text-white" : tone === "light" ? "text-[#0b0d14]" : "text-foreground";
  const blue = (part: "tag" | "forge") =>
    tone === "auto"
      ? part === "tag"
        ? "text-[#0b7fae] dark:text-[#14b3e0]"
        : "text-[#0b7fae] dark:text-[#6fe3ff]"
      : undefined;
  const style = (part: "tag" | "forge") =>
    tone === "auto" ? undefined : { color: (tone === "dark" ? onDark : onLight)[part] };
  return (
    <span
      className={cn("whitespace-nowrap font-mono leading-none tracking-[-0.045em]", className)}
      aria-label={PRODUCT_NAME}
    >
      <span className={cn("font-extrabold", blue("tag"))} style={style("tag")}>
        &lt;
      </span>
      <span className={cn("font-bold", nameClass)}>{first}</span>
      <span className={cn("font-extrabold", blue("forge"))} style={style("forge")}>
        _
      </span>
      <span className={cn("font-extrabold", blue("forge"))} style={style("forge")}>
        {second}
      </span>
      <span className={cn("font-extrabold", blue("tag"))} style={style("tag")}>
        /&gt;
      </span>
    </span>
  );
}

export function ProductLogo({
  className,
  tone,
  wordmarkClassName,
}: {
  className?: string;
  tone?: "dark" | "light" | "auto";
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <ProductMark />
      <ProductWordmark tone={tone} className={cn("text-[19px]", wordmarkClassName)} />
    </span>
  );
}
