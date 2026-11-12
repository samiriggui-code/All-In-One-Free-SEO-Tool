"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  TestTube2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { testWebhook } from "./actions";

export function WebhookTester({ defaultUrl }: { defaultUrl?: string }) {
  const tx = useTranslations("ui.app_automations_webhook-tester");
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "ok"; status: number }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });

  function run() {
    if (!url.trim()) return;
    setResult({ kind: "idle" });
    startTransition(async () => {
      const r = await testWebhook(url.trim());
      if (r.ok) setResult({ kind: "ok", status: r.status });
      else setResult({ kind: "error", msg: r.error });
    });
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <TestTube2 className="size-4 text-violet-300" />
        {tx("testAWebhook")}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {tx("postsASamplePayloadConfirms")}
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="flex-1"
          disabled={pending}
        />
        <Button onClick={run} disabled={pending || !url.trim()}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {tx("testing")}
            </>
          ) : (
            <>
              <TestTube2 className="size-4" />
              {tx("sendTest")}
            </>
          )}
        </Button>
      </div>
      {result.kind === "ok" && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
          <CheckCircle2 className="size-3" />
          {tx("deliveredCheckYourChannel", { status: result.status })}
        </div>
      )}
      {result.kind === "error" && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300 ring-1 ring-inset ring-rose-500/30">
          <AlertCircle className="size-3" />
          {result.msg}
        </div>
      )}
    </div>
  );
}
