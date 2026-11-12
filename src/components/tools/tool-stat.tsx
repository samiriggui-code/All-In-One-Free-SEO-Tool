/**
 * One figure in a tool's result header: small caps label, big number,
 * optional colour and hint. Fourteen tool pages carried their own copy.
 */

const TONE_CLASS = {
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  rose: "text-rose-300",
} as const;

export function ToolStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof TONE_CLASS;
}) {
  const t = tone ? TONE_CLASS[tone] : "";
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${t}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
