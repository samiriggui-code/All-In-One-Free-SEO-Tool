import { cn } from "@/lib/utils";

/**
 * The product's own logo: a code tag whose slash is a rising arrow,
 * `</>` read as "ranking up", next to the name written as a tag.
 */

export function ProductMark({
  className,
  from = "#7c3aed",
  to = "#38bdf8",
}: {
  className?: string;
  from?: string;
  to?: string;
}) {
  const id = `pm-${from.slice(1)}-${to.slice(1)}`;
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="40" x2="40" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 14 7 20l5.5 6" />
        <path d="M27.5 14 33 20l-5.5 6" />
        <path d="M16.5 28 23.5 12" />
        <path d="M18.6 12.4 23.5 12l1.6 4.6" />
      </g>
    </svg>
  );
}

/**
 * `<name/>` in monospace. An underscore in the name is drawn in the
 * accent colour, so `seo_rank` reads as two words.
 */
export function ProductWordmark({
  name,
  className,
  accent = "#a78bfa",
}: {
  name: string;
  className?: string;
  accent?: string;
}) {
  const parts = name.split(/(_|\.)/);
  return (
    <span
      className={cn("whitespace-nowrap font-mono font-semibold tracking-tight", className)}
      aria-label={name}
    >
      <span style={{ color: accent }}>&lt;</span>
      {parts.map((p, i) =>
        p === "_" || p === "." ? (
          <span key={i} style={{ color: accent }}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
      <span style={{ color: accent }}>/&gt;</span>
    </span>
  );
}

export function ProductLogo({
  name,
  className,
  from,
  to,
  accent,
  wordmarkClassName,
}: {
  name: string;
  className?: string;
  from?: string;
  to?: string;
  accent?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <ProductMark from={from} to={to} />
      <ProductWordmark name={name} accent={accent} className={cn("text-[17px]", wordmarkClassName)} />
    </span>
  );
}

/** The product's name, written as it appears in the tag. */
export const PRODUCT_NAME = "rank_forge";
