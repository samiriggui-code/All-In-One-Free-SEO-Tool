"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, ListChecks } from "lucide-react";
import { GskSheet } from "@/app/settings/gsk-sheet";

/**
 * "What to do for this client", out of the page and into a sheet.
 *
 * The client page used to open on two stacked panels, the start-here
 * steps and the ranked recommendations, above everything else. They are
 * a to-do list, not the client: one button at the top of the tools rail
 * opens them in a GsKnora sheet with one tab each.
 *
 * Both panels are rendered on the server and handed in as nodes, so their
 * data loading and links are unchanged.
 */
export function ClientActionPlan({
  startHere,
  recommendations,
  recommendationCount,
  setupLeft,
}: {
  startHere: React.ReactNode;
  recommendations: React.ReactNode;
  recommendationCount: number;
  /** Start-here steps not done yet; 0 once onboarding is through. */
  setupLeft: number;
}) {
  const t = useTranslations("clientPage.actionPlan");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"start" | "recs">(setupLeft > 0 ? "start" : "recs");
  const total = setupLeft + recommendationCount;

  return (
    <>
      <button type="button" className="gsk-plan-button" onClick={() => setOpen(true)}>
        <span className="gsk-plan-button__icon" aria-hidden>
          <ListChecks className="size-4" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[13px] font-semibold leading-tight">{t("button")}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {total > 0 ? t("buttonHint", { count: total }) : t("buttonDone")}
          </span>
        </span>
        {total > 0 ? <span className="gsk-plan-button__count">{total}</span> : null}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <GskSheet
          title={t("title")}
          subtitle={t("subtitle")}
          icon={<ListChecks className="size-4" />}
          closeLabel={t("close")}
          onClose={() => setOpen(false)}
        >
          <div className="gsk-drawer__body">
            <div className="gsk-tabbar mb-0" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "start"}
                className="gsk-tab"
                onClick={() => setTab("start")}
              >
                {t("tabStart")}
                {setupLeft > 0 ? <span className="gsk-tab__count">{setupLeft}</span> : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "recs"}
                className="gsk-tab"
                onClick={() => setTab("recs")}
              >
                {t("tabRecs")}
                <span className="gsk-tab__count">{recommendationCount}</span>
              </button>
            </div>
            <div className="gsk-plain" role="tabpanel">
              {tab === "start" ? startHere : recommendations}
            </div>
          </div>
          <footer className="gsk-drawer__footer">
            <span className="text-[13px] text-[var(--gsk-text-2)]">{t("footer")}</span>
            <button type="button" className="gsk-btn" onClick={() => setOpen(false)}>
              {t("close")}
            </button>
          </footer>
        </GskSheet>
      ) : null}
    </>
  );
}
