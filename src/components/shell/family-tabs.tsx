"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { familyOf, familyTabHref, projectIdOfRoute } from "@/lib/tool-families";
import { useProjectContext } from "@/lib/project-context";

/**
 * The tabs of a tool family, above every page that belongs to one
 * (tool-families.ts). Four views of page speed are one tool with four
 * tabs, not four entries to choose between.
 *
 * Inside a project (a `/c/<id>` page, or a tool opened with `?clientId=`)
 * every tab stays in that project: a link opened from a client stays in
 * that client (docs/HANDOFF.md §C, rule 5).
 *
 * Rendered once in the root layout, like the missing-key banner, so a
 * member page needs no change to join or leave a family.
 */
function Tabs() {
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const known = useProjectContext();
  const t = useTranslations("toolFamilies");
  const hit = familyOf(pathname);
  if (!hit) return null;
  const { family, member } = hit;

  const fromQuery = Number(params?.get("clientId"));
  const id = projectIdOfRoute(pathname) ?? (Number.isInteger(fromQuery) && fromQuery > 0 ? fromQuery : null);
  const project =
    id === null ? null : { id, url: known?.id === id ? known.url : (params?.get("url") ?? null) };

  return (
    <nav aria-label={t(`${family.id}.title`)} className="mx-auto mb-4 w-full max-w-5xl">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t(`${family.id}.title`)}</p>
      <div className="gsk-tabbar mb-0 max-w-full overflow-x-auto">
        {family.members.map((m) => (
          <Link
            key={m.href}
            href={familyTabHref(m.href, project)}
            aria-current={m.href === member.href ? "page" : undefined}
            className="gsk-tab whitespace-nowrap"
          >
            {t(`${family.id}.tabs.${m.tab}`)}
          </Link>
        ))}
      </div>
      {/* A family the site audit already covers says so, and leads there. */}
      {t.has(`${family.id}.note`) ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t(`${family.id}.note`)}{" "}
          <Link
            href={project ? `/audits/c/${project.id}` : "/audits"}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {t(`${family.id}.noteLink`)}
          </Link>
        </p>
      ) : null}
    </nav>
  );
}

export function FamilyTabs() {
  // useSearchParams needs a boundary on statically rendered pages.
  return (
    <Suspense fallback={null}>
      <Tabs />
    </Suspense>
  );
}
