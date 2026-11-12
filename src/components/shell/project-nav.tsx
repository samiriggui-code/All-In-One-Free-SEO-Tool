"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { activeProjectPage, type ProjectTab } from "@/lib/project-nav";
import { setProjectContext } from "@/lib/project-context";

/**
 * The project's navigation, on every page of a project: where you are
 * (Clients › client › project), the tabs, and the pages of the open tab.
 * A link opened from a project stays in that project (docs/HANDOFF.md §C,
 * rule 5). Drawn by the client-scope layout (client-scope-layout.tsx).
 */
export function ProjectNav({
  project,
  account,
  tabs,
}: {
  project: { id: number; name: string; url: string };
  account: { id: number; name: string } | null;
  tabs: ProjectTab[];
}) {
  const t = useTranslations("projectNav");
  const pathname = usePathname() ?? "";
  const tab = useSearchParams()?.get("tab") ?? null;
  const active = activeProjectPage(pathname, tab, project.id);
  const open = tabs.find((x) => x.group === active?.group) ?? null;
  // Tabs outside the project's missions wait behind "Other tools". The
  // open one always shows, so the bar never hides where you are.
  const [showAll, setShowAll] = useState(false);
  const secondaryCount = tabs.filter((x) => x.secondary).length;
  const shown = tabs.filter((x) => showAll || !x.secondary || x.group === active?.group);

  // Tell the rest of the shell which project is open, so the family tabs
  // and a tool's back link stay in it (lib/project-context.ts).
  useEffect(() => {
    setProjectContext({ id: project.id, name: project.name, url: project.url });
  }, [project.id, project.name, project.url]);

  return (
    <nav aria-label={t("aria")} className="mb-5 space-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/clients" className="hover:text-foreground hover:underline">
          {t("clients")}
        </Link>
        <ChevronRight className="size-3 shrink-0" />
        {account ? (
          <>
            <Link href={`/clients/accounts/${account.id}`} className="truncate hover:text-foreground hover:underline">
              {account.name}
            </Link>
            <ChevronRight className="size-3 shrink-0" />
          </>
        ) : null}
        <Link href={`/clients/${project.id}`} className="truncate font-medium text-foreground hover:underline">
          {project.name}
        </Link>
        <span className="truncate">· {project.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
      </div>

      <div className="gsk-tabbar mb-0 overflow-x-auto">
        {shown.map((x) => (
          <Link
            key={x.group}
            href={x.href}
            aria-current={active?.group === x.group ? "page" : undefined}
            className="gsk-tab whitespace-nowrap"
            scroll={false}
          >
            {t(`groups.${x.group}`)}
          </Link>
        ))}
        {secondaryCount > 0 ? (
          <button
            type="button"
            className="gsk-tab inline-flex items-center gap-1 whitespace-nowrap"
            aria-expanded={showAll}
            title={t("moreHint")}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? t("less") : t("more")}
            {showAll ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        ) : null}
      </div>

      {open && open.pages.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {open.pages.map((p) => {
            const current = active?.key === p.key;
            return (
              <Link
                key={p.key}
                href={p.href}
                aria-current={current ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  current
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {t(`pages.${p.key}`)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}
