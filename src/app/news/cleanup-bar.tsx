"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
  cleanupOldItems,
  clearAllItems,
  deleteOneItem,
} from "./actions";

export function CleanupBar() {
  const tx = useTranslations("ui.app_news_cleanup-bar");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function clean(days: number) {
    setMsg(null);
    startTransition(async () => {
      const r = await cleanupOldItems({ days });
      setMsg(tx("deletedOtherOlderThanDays", { deleted: r.deleted, days }));
      setTimeout(() => setMsg(null), 4000);
    });
  }

  async function clearAll() {
    const ok = await confirmDialog({
      title: tx("deleteEverySavedNewsItem"),
      description: tx("feedConfigurationsStayItemsCan"),
      confirmLabel: tx("deleteAllItems"),
      destructive: true,
    });
    if (!ok) return;
    setMsg(null);
    startTransition(async () => {
      const r = await clearAllItems();
      setMsg(tx("clearedItems", { deleted: r.deleted }));
      setTimeout(() => setMsg(null), 4000);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">{tx("cleanUpOlderThan")}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => clean(7)}
        disabled={pending}
      >
        <Trash2 className="size-3" />
        7d
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => clean(30)}
        disabled={pending}
      >
        <Trash2 className="size-3" />
        30d
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => clean(90)}
        disabled={pending}
      >
        <Trash2 className="size-3" />
        90d
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clearAll}
        disabled={pending}
        className="text-rose-300/70 hover:text-rose-300"
      >
        {tx("clearAll")}
      </Button>
      {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      {msg && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
          <CheckCircle2 className="size-3" />
          {msg}
        </span>
      )}
    </div>
  );
}

export function DeleteItemButton({ id }: { id: number }) {
  const tx = useTranslations("ui.app_news_cleanup-bar");
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await deleteOneItem(id);
          setHidden(true);
        })
      }
      disabled={pending}
      title={tx("deleteThisItem")}
      className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/15 hover:text-rose-300"
    >
      <X className="size-3" />
    </button>
  );
}
