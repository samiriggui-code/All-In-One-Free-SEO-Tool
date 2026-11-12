"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { runAutomationNow } from "./actions";

/** Runs an automation's AI step now, to try it before its schedule. */
export function RunNowButton({ id }: { id: number }) {
  const t = useTranslations("ui.app_automations_page");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={t("runNow")}
      title={t("runNow")}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await runAutomationNow(id);
          if (!r.ok) toast.error(r.error);
          else if (r.failed) toast.error(t("runFailed", { failed: r.failed, runs: r.runs }));
          else toast.success(t("runDone", { runs: r.runs }));
          router.refresh();
        })
      }
      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
    </button>
  );
}
