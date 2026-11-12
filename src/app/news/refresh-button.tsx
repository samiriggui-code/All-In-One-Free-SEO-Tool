"use client";

import { useTranslations } from "next-intl";
import { useTransition, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshFeeds } from "./actions";

export function RefreshFeedsButton() {
  const tx = useTranslations("ui.app_news_refresh-button");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const r = await refreshFeeds();
      setMsg(
        `Checked ${r.feedsChecked}, ${r.itemsAdded} new item${r.itemsAdded === 1 ? "" : "s"}${
          r.feedsFailed > 0 ? `, ${r.feedsFailed} failed` : ""
        }`,
      );
      setTimeout(() => setMsg(null), 4000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={run} disabled={pending} variant="outline" size="sm">
        {pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            {tx("refreshing")}
          </>
        ) : (
          <>
            <RefreshCw className="size-3.5" />
            {tx("refreshFeeds")}
          </>
        )}
      </Button>
      {msg && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
          <CheckCircle2 className="size-3" />
          {msg}
        </span>
      )}
    </div>
  );
}
