"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshGoogleUpdatesAction } from "./actions";

export function RefreshGoogleUpdatesButton() {
  const tx = useTranslations("ui.app_algorithm-updates_refresh-button");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const r = await refreshGoogleUpdatesAction();
      if (!r.ok) setMsg(r.error);
      else if (r.added > 0) setMsg(tx("newFromGoogle", { added: r.added }));
      else setMsg(tx("upToDateWithGoogle"));
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={run} disabled={pending} variant="outline" size="sm">
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        {pending ? tx("checkingGoogle") : tx("checkGoogleNow")}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
