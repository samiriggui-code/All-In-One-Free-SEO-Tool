"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ReportFilter = "all" | "fail" | "warn" | "pass" | "not-measured";

/**
 * The status tabs above the category cards. Rows carry `data-status`; the
 * wrapper's `data-filter` hides the rest (see `.engine-report` in
 * globals.css), so the server-rendered list is never re-rendered here.
 */
export function ReportFilters({
  tabs,
  children,
}: {
  tabs: { id: ReportFilter; label: string; count: number }[];
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const ref = useRef<HTMLDivElement>(null);

  // Passed and not-measured rows sit inside collapsed <details>; open them
  // when those are what the user asked to see.
  useEffect(() => {
    const quietFilter = filter === "pass" || filter === "not-measured";
    ref.current?.querySelectorAll<HTMLDetailsElement>("details[data-quiet]").forEach((d) => {
      d.open = quietFilter;
    });
  }, [filter]);

  return (
    <div ref={ref} className="engine-report space-y-4" data-filter={filter}>
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors",
              filter === tab.id
                ? "bg-cyan-500/20 text-cyan-100 ring-cyan-400/40"
                : "bg-white/[0.03] text-muted-foreground ring-white/10 hover:text-foreground",
            )}
          >
            {tab.label}
            <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] tabular-nums">
              {tab.count}
            </span>
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
