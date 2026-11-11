"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { activeProjectPage, type ProjectTab } from "@/lib/project-nav";

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
        {tabs.map((x) => (
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
