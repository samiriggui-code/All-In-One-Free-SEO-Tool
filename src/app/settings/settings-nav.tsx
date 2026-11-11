"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  Archive,
  Bell,
  Brain,
  Bug,
  Cloud,
  Database,
  Download,
  Gauge,
  Globe,
  Key,
  Mail,
  Palette,
  Plug,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Users2,
  type LucideIcon,
} from "lucide-react";
import {
  LEGACY_ANCHORS,
  SETTINGS_NAV,
  activeSettingsItem,
  type SettingsIconName,
} from "./nav";

const ICONS: Record<SettingsIconName, LucideIcon> = {
  settings: Settings,
  sparkles: Sparkles,
  gauge: Gauge,
  brain: Brain,
  plug: Plug,
  mail: Mail,
  bell: Bell,
  key: Key,
  palette: Palette,
  users: Users2,
  database: Database,
  archive: Archive,
  refresh: RefreshCw,
  download: Download,
  globe: Globe,
  cloud: Cloud,
  activity: Activity,
  bug: Bug,
  shield: Shield,
};

export function SettingsNav({ isOwner }: { isOwner: boolean }) {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();
  const router = useRouter();
  const active = activeSettingsItem(pathname);

  // /settings#ai and friends: the hash never reaches the server, so the
  // old single-page anchors are resolved here.
  useEffect(() => {
    if (pathname !== "/settings") return;
    const target = LEGACY_ANCHORS[window.location.hash.slice(1)];
    if (target && target !== "/settings") router.replace(target);
  }, [pathname, router]);

  const groups = SETTINGS_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => isOwner || !i.ownerOnly),
  })).filter((g) => g.items.length > 0);

  return (
    <nav aria-label={t("aria")} className="flex min-h-0 flex-1 flex-col">
      {/* Phone and small tablet: one scrollable row of sections. */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
        {groups.flatMap((g) => g.items).map((item) => {
          const Icon = ICONS[item.icon];
          const on = active?.id === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                on
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {t(`items.${item.id}`)}
            </Link>
          );
        })}
      </div>

      {/* Desktop: the rail. */}
      <div className="hidden min-h-0 flex-1 overflow-y-auto p-3 md:block">
        {groups.map((g) => (
          <div key={g.id} className="mb-3 last:mb-0">
            <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {t(`groups.${g.id}`)}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = ICONS[item.icon];
                const on = active?.id === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={on ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        on
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-foreground/80 hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${on ? "" : "text-muted-foreground"}`} />
                      {t(`items.${item.id}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
