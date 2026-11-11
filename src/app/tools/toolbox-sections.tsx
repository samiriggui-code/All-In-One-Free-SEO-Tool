"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { toolboxGroups } from "@/components/shell/nav-items";
import { navItemMessageKey } from "@/i18n/nav";

/**
 * The pages that used to fill the sidebar, grouped as they were there.
 * The sidebar keeps eight entries; this is where the rest is reached from.
 *
 * A client component on purpose: nav-items is the sidebar's module, and
 * importing it from a server component as well put it in both graphs,
 * which sent Turbopack dev into a recompile-and-reload loop on every page.
 */
export function ToolboxSections() {
  const t = useTranslations("nav");
  const groups = toolboxGroups();

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">{t("toolbox.title")}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("toolbox.hint")}</p>
      <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((g) => (
          <div key={g.id}>
            <h3 className="text-xs font-semibold text-muted-foreground">{t(`groups.${g.id}`)}</h3>
            <ul className="mt-1.5 space-y-0.5">
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{t(`items.${navItemMessageKey(it.href)}`)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
