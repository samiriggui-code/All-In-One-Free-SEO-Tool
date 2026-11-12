"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { familyOf } from "@/lib/tool-families";

/**
 * The tabs of a tool family, above every page that belongs to one
 * (tool-families.ts). Four views of page speed are one tool with four
 * tabs, not four entries to choose between.
 *
 * Rendered once in the root layout, like the missing-key banner, so a
 * member page needs no change to join or leave a family.
 */
export function FamilyTabs() {
  const pathname = usePathname() ?? "";
  const t = useTranslations("toolFamilies");
  const hit = familyOf(pathname);
  if (!hit) return null;
  const { family, member } = hit;

  return (
    <nav aria-label={t(`${family.id}.title`)} className="mx-auto mb-4 w-full max-w-5xl">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t(`${family.id}.title`)}</p>
      <div className="gsk-tabbar mb-0 max-w-full overflow-x-auto">
        {family.members.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            aria-current={m.href === member.href ? "page" : undefined}
            className="gsk-tab whitespace-nowrap"
          >
            {t(`${family.id}.tabs.${m.tab}`)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
