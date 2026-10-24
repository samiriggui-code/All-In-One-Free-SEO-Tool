"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteClient } from "../actions";

type CountsToDelete = {
  audits: number;
  auditIssues: number;
  tasks: number;
  keywords: number;
  rankings: number;
  backlinks: number;
  reports: number;
  snapshots: number;
};

const COUNT_KEYS = [
  "audits",
  "auditIssues",
  "tasks",
  "keywords",
  "rankings",
  "backlinks",
  "reports",
  "snapshots",
] as const satisfies readonly (keyof CountsToDelete)[];

export function DeleteClientButton({
  clientId,
  clientName,
  counts,
}: {
  clientId: number;
  clientName: string;
  counts: CountsToDelete;
}) {
  const router = useRouter();
  const t = useTranslations("clientPage.delete");
  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const normalizeName = (s: string) =>
    s.trim().replace(/\s+/g, " ").toLowerCase();
  const canDelete =
    normalizeName(typedName) === normalizeName(clientName);

  const totalRows =
    counts.audits +
    counts.auditIssues +
    counts.tasks +
    counts.keywords +
    counts.rankings +
    counts.backlinks +
    counts.reports +
    counts.snapshots;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canDelete || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteClient(clientId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push("/clients");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          setOpen(true);
          setTypedName("");
          setError(null);
        }}
      >
        <Trash2 className="mr-1.5 size-3.5" />
        {t("button")}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("hint")}
      </p>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="max-h-[min(90dvh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-rose-500/30 bg-card shadow-2xl shadow-rose-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-2 border-b border-rose-500/20 bg-rose-500/[0.06] px-5 py-3">
              <AlertTriangle className="size-4 text-rose-300" />
              <h3 className="flex-1 text-sm font-semibold text-rose-200">
                {t("title", { name: clientName })}
              </h3>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                disabled={pending}
                aria-label={t("close")}
                className="rounded-md p-1 text-muted-foreground hover:bg-white/5 disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </header>

            <div className="space-y-3 p-5 text-sm">
              <p className="text-muted-foreground">
                {t.rich("intro", {
                  code: (chunks) => <span className="font-mono text-xs">{chunks}</span>,
                })}
              </p>

              <ul className="space-y-1 rounded-md bg-rose-500/[0.04] p-3 text-xs ring-1 ring-inset ring-rose-500/20">
                {COUNT_KEYS.filter((k) => counts[k] > 0).map((k) => (
                  <li key={k}>
                    {t.rich(`counts.${k}`, {
                      count: counts[k],
                      b: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </li>
                ))}
                {totalRows === 0 && (
                  <li className="text-muted-foreground">
                    {t("none")}
                  </li>
                )}
                <li className="mt-2 border-t border-rose-500/15 pt-2 text-rose-200">
                  {t("plus")}
                </li>
              </ul>

              <p className="text-[11px] text-amber-300">
                {t.rich("irreversible", {
                  b: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>

              <form onSubmit={onSubmit} className="space-y-2">
                <label className="block space-y-1 text-xs">
                  <span className="text-muted-foreground">
                    {t.rich("typeToConfirm", {
                      name: () => (
                        <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-rose-300">
                          {clientName}
                        </span>
                      ),
                    })}
                  </span>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder={clientName}
                    autoFocus
                    disabled={pending}
                    className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-rose-500/40 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
                  />
                </label>

                {error && (
                  <p className="rounded-md bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300 ring-1 ring-inset ring-rose-500/30">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="rounded-md bg-white/5 px-3 py-1.5 text-xs ring-1 ring-inset ring-white/10 hover:bg-white/10 disabled:opacity-50"
                  >
                    {t("keep")}
                  </button>
                  <button
                    type="submit"
                    disabled={!canDelete || pending}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-200 ring-1 ring-inset ring-rose-500/40 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="size-3" />
                    {pending ? t("deleting") : t("deleteForever")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
