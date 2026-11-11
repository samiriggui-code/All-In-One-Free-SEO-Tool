"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { pageProgress, type TaskPage } from "@/lib/task-pages";
import { setTaskPageDone } from "./actions";

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search || "/";
  } catch {
    return url;
  }
}

/**
 * The pages a task is about, each with its own tick (lib/task-pages.ts).
 * Folded behind "3/12 pages" so a long list does not push the next task
 * off the screen; open from the start when there are only a few.
 */
export function TaskPagesList({ taskId, pages: initial }: { taskId: number; pages: TaskPage[] }) {
  const t = useTranslations("taskPages");
  const router = useRouter();
  const [pages, setPages] = useState(initial);
  const [open, setOpen] = useState(initial.length <= 3);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { done, total } = pageProgress(pages);

  function toggle(url: string, next: boolean) {
    setError(null);
    // Optimistic: the tick follows the click, the server confirms.
    setPages((ps) => ps.map((p) => (p.url === url ? { ...p, done: next } : p)));
    startTransition(async () => {
      const r = await setTaskPageDone(taskId, url, next);
      if (!r.ok) {
        setPages((ps) => ps.map((p) => (p.url === url ? { ...p, done: !next } : p)));
        setError(t("error"));
        return;
      }
      setPages(r.pages);
      // The task's own status may have changed (last page ticked).
      router.refresh();
    });
  }

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {t("progress", { done, total })}
      </button>
      {open ? (
        <ul className="mt-1.5 space-y-1">
          {pages.map((p) => (
            <li key={p.url} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={p.done}
                disabled={pending}
                onChange={(e) => toggle(p.url, e.target.checked)}
                aria-label={t("markDone", { page: pathOf(p.url) })}
                className="size-3.5 cursor-pointer rounded accent-[var(--primary)]"
              />
              <span className={`min-w-0 flex-1 truncate font-mono ${p.done ? "text-muted-foreground line-through" : ""}`}>
                {pathOf(p.url)}
              </span>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                aria-label={t("open", { page: pathOf(p.url) })}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
