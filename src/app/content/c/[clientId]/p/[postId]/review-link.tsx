"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setArticleReview } from "@/app/content/actions";

/**
 * Open the article to the client for a read before it goes live, and
 * copy the link. The page is in the client's portal
 * (portal/[token]/articles/[id]); closing the review takes it down.
 */
export function ReviewLink({
  clientId,
  postId,
  initialPath,
  hasDraft,
}: {
  clientId: number;
  postId: number;
  /** The review page's path when the article is already shared. */
  initialPath: string | null;
  hasDraft: boolean;
}) {
  const t = useTranslations("content.review");
  const tErr = useTranslations("content.errors");
  const [path, setPath] = useState(initialPath);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (shared: boolean) => {
    setError(null);
    start(async () => {
      const r = await setArticleReview({ clientId, postId, shared });
      if (r.ok) setPath(r.path);
      else setError(tErr(r.error));
    });
  };

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/40 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{t("title")}</span>
        <span className="block text-xs text-muted-foreground">
          {path ? t("on") : hasDraft ? t("off") : t("needsDraft")}
        </span>
      </span>
      {path ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.origin + path);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setError(window.location.origin + path);
              }
            }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? t("copied") : t("copy")}
          </Button>
          <a
            href={path}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            {t("open")}
          </a>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => toggle(false)}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <EyeOff className="size-3.5" />}
            {t("stop")}
          </Button>
        </>
      ) : (
        <Button type="button" size="sm" variant="outline" disabled={pending || !hasDraft} onClick={() => toggle(true)}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
          {t("share")}
        </Button>
      )}
      {error && <p className="basis-full break-all text-xs text-rose-500">{error}</p>}
    </section>
  );
}
