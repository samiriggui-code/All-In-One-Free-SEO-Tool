"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { capabilityOf } from "@/lib/tool-capabilities";

/**
 * Tells you a page will not work before you try to use it.
 *
 * Why a banner and not hiding the page: hiding is right when someone is
 * choosing between things, and wrong once they have chosen. On the tools
 * grid, filtering out what cannot run keeps 88 cards readable and the
 * count stays visible so nothing is secretly missing. But if you have
 * navigated *to* a tool — from search, a bookmark, a link in a report —
 * you already want that one, and an empty page or a redirect is hostile.
 * It reads as broken rather than as unconfigured.
 *
 * So the page still renders, and this says what is missing and offers
 * the fix in one click. The rule: filter in lists, explain on the thing
 * itself.
 *
 * Rendered once in the root layout rather than in each of the 38 pages
 * that need a model — one place to be right, and it covers /agent,
 * /blog, /reports and the assistant too, not only /tools/*.
 */
export function NeedsKeyBanner({
  hasKey,
  hasSubscription,
  client,
}: {
  hasKey: boolean;
  hasSubscription: boolean;
  client: string | null;
}) {
  const pathname = usePathname();
  const t = useTranslations("shell.needsKey");

  // A key is the only thing that makes these pages run, so once one
  // exists there is nothing to say.
  if (hasKey) return null;

  const cap = capabilityOf(pathname);
  if (!cap?.needsAI) return null;

  // Only fires on a page that genuinely calls a model. The capability
  // data over-approximates on composed pages — /audits is flagged because
  // it embeds an add-client dialog — so this is deliberately limited to
  // /tools/* and the handful of AI pages, rather than every route the
  // graph happens to mark.
  const isAiPage =
    /^\/tools\/[^/]+$/.test(pathname) ||
    ["/agent", "/seo-chat", "/ai-visibility"].includes(
      pathname,
    );
  if (!isAiPage) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex flex-wrap items-start gap-2.5">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-amber-500 dark:text-amber-300" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {t("title")}
          </p>
          <p className="text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">
            {t("body")}
          </p>

          {/* Said here because it is the exact moment the question comes
              up: the settings screen says connected, so why is this
              asking for a key? */}
          {hasSubscription && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">
              <MessageSquare className="size-3 shrink-0" />
              <span>
                {t("subscription", { client: client ?? t("yourChatApp") })}
              </span>
            </p>
          )}

          <Link
            href="/settings#ai"
            className="inline-flex h-8 items-center rounded-lg bg-amber-500/20 px-3 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-500/40 hover:bg-amber-500/30 dark:text-amber-100"
          >
            {t("connect")}
          </Link>
        </div>
      </div>
    </div>
  );
}
