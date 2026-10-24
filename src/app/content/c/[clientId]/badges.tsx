import type { ContentPost } from "@/lib/content-studio/store";

const statusTone: Record<ContentPost["status"], string> = {
  idea: "bg-white/5 text-muted-foreground ring-white/10",
  outline_approved: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/30",
  draft: "bg-violet-500/10 text-violet-300 ring-violet-500/30",
  scheduled: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  published: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
};

export function StatusBadge({ status, label }: { status: ContentPost["status"]; label: string }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusTone[status]}`}>
      {label}
    </span>
  );
}

export function scoreTone(score: number): string {
  if (score >= 75) return "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30";
  if (score >= 55) return "bg-amber-500/10 text-amber-300 ring-amber-500/30";
  return "bg-rose-500/10 text-rose-300 ring-rose-500/30";
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  return (
    <span className={`inline-flex h-7 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-bold ring-1 ring-inset ${scoreTone(score)}`}>
      {score}
    </span>
  );
}
