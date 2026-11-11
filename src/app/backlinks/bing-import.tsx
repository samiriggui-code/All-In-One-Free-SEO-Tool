"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { NeedsConnection } from "@/components/ui/needs-connection";
import { importBingBacklinksAction } from "./bing-actions";

/**
 * Pull backlinks from Bing Webmaster Tools.
 *
 * The copy carries the limitations rather than hiding them. Backlinks
 * are this project's weakest data and the README says so; a button that
 * implied "here is your backlink profile" would undo that honesty in the
 * one place a user acts on it.
 */
export function BingBacklinkImport({
  clientId,
  hasKey,
}: {
  clientId: number;
  hasKey: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("linksTab.backlinks.bingImport");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  return (
    <section className="glass-apple rounded-xl p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Database className="size-4 text-emerald-300" />
        {t("title")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t.rich("intro", {
          strong: (c) => (
            <strong className="font-medium text-foreground">{c}</strong>
          ),
        })}
      </p>

      {!hasKey ? (
        // Was hand-written and said "add it in Settings" — where the Bing
        // key isn't. It lives on /tools/bing. Now sourced from the
        // integrations catalog so the destination can't be wrong.
        <div className="mt-3">
          <NeedsConnection
            id="bing"
            because={t("needsKey")}
          />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setResult(null);
                setFailed(false);
                const r = await importBingBacklinksAction(clientId);
                if (!r.ok) {
                  setFailed(true);
                  setResult(r.error ?? t("failed"));
                  return;
                }
                const parts: string[] = [];
                if (r.added) parts.push(t("added", { count: r.added }));
                if (r.updated) parts.push(t("updated", { count: r.updated }));
                setResult(
                  (parts.length
                    ? t("summary", {
                        parts: parts.join(", "),
                        count: r.scannedPages,
                      })
                    : t("nothingNew")) + (r.note ? ` ${r.note}` : ""),
                );
                router.refresh();
              })
            }
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Database className="size-3.5" />
            )}
            {t("submit")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("safeToRerun")}
          </span>
        </div>
      )}

      {result && (
        <p
          className={`mt-3 rounded-md px-3 py-2 text-xs ${
            failed
              ? "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/25"
              : "bg-emerald-500/10 text-emerald-200 ring-1 ring-inset ring-emerald-500/25"
          }`}
        >
          {result}
        </p>
      )}
    </section>
  );
}
