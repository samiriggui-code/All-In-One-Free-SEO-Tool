"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { runBrandMonitor } from "../../actions";

export function RunButton({ clientId }: { clientId: number }) {
  const t = useTranslations("aiTab.brandMonitor.run");
  const [, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <button
        type="button"
        disabled={running}
        onClick={() => {
          setRunning(true);
          setMsg(null);
          startTransition(async () => {
            const r = await runBrandMonitor(clientId);
            setRunning(false);
            if (r.ok) {
              setMsg(
                r.added > 0
                  ? t("added", { count: r.added })
                  : t("none"),
              );
              setTimeout(() => location.reload(), 800);
            } else {
              setMsg(t("error", { error: r.error }));
            }
          });
        }}
        className="inline-flex h-9 items-center rounded-md bg-amber-500/15 px-4 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
      >
        {running ? (
          <>
            <Loader2 className="mr-2 size-3 animate-spin" />
            {t("scanning")}
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 size-3" />
            {t("scan")}
          </>
        )}
      </button>
    </div>
  );
}
