import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The product's own logo. The mark is the monogram `<rf/>` with its
 * slash in the app's blue; the name is written as a tag, `<rank_forge/>`,
 * with "forge" in the same blue gradient.
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
      <rect width="48" height="48" rx="13" fill={INK} />
      <rect x="1" y="1" width="46" height="46" rx="12" fill="none" stroke={`url(#${id})`} strokeOpacity=".55" />
      <text
        x="20.5"
        y="29.5"
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontWeight="700"
        fontSize="14.5"
        letterSpacing="-1.2"
        fill="#fff"
      >
        rf
      </text>
      <path d="M28.5 31.5 32 16.5" stroke={`url(#${id})`} strokeWidth="3" strokeLinecap="round" />
      <g fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 18.5 6.5 24l4.5 5.5" />
        <path d="M36.5 18.5 41 24l-4.5 5.5" />
      </g>
    </svg>
  );
}

/** `<rank_forge/>` in monospace: brackets dimmed, "forge" in the brand blue. */
export function ProductWordmark({
  className,
  tone = "dark",
}: {
  className?: string;
  /** The background it sits on; "auto" follows the light / dark theme. */
  tone?: "dark" | "light" | "auto";
}) {
  const [first, second] = PRODUCT_NAME.split("_");
  const dimClass =
    tone === "dark" ? "text-white/40" : tone === "light" ? "text-[#0b0d14]/35" : "text-muted-foreground/70";
  const nameClass =
    tone === "dark" ? "text-white" : tone === "light" ? "text-[#0b0d14]" : "text-foreground";
  return (
    <span
      className={cn("whitespace-nowrap font-mono leading-none tracking-[-0.04em]", className)}
      aria-label={PRODUCT_NAME}
    >
      <span className={dimClass}>&lt;</span>
      <span className={cn("font-medium", nameClass)}>
        {first}
      </span>
      <span className="font-bold" style={{ color: BRAND_GRADIENT[1] }}>
        _
      </span>
      <span
        className="bg-clip-text font-extrabold text-transparent"
        style={{
          backgroundImage: `linear-gradient(90deg, ${BRAND_GRADIENT[0]}, ${BRAND_GRADIENT[1]} 55%, ${BRAND_GRADIENT[2]})`,
        }}
      >
        {second}
      </span>
      <span className={dimClass}>/&gt;</span>
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
