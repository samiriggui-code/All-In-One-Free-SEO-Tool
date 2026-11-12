"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ThemePreference } from "@/app/settings/theme-actions";
import { openAssistant } from "./ai-assistant";
import { NotificationsBell } from "./notifications-bell";
import { ProfileMenu } from "./profile-menu";
import { ThemeToggle } from "./theme-toggle";

/**
 * The bottom of the sidebar, as in GsKnora (components/menu.vue,
 * `.menu_bottom` + UserMenu.vue): the user bar with the notification bell
 * beside it, and above it the assistant and the theme. They used to crowd
 * the top bar and float over the page in the bottom-right corner, where
 * they covered the end of rows.
 *
 * Phones never see this (the sidebar is md+); they keep the top-bar avatar
 * and bell and the floating assistant button.
 */
export function SidebarFooter({
  collapsed,
  theme,
}: {
  collapsed: boolean;
  theme: ThemePreference;
}) {
  const t = useTranslations("shell.assistant");

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-sidebar-border py-2">
        <button
          type="button"
          onClick={openAssistant}
          title={t("openTitle")}
          aria-label={t("open")}
          className="grid size-8 place-items-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Sparkles className="size-4" />
        </button>
        <ThemeToggle theme={theme} />
        <NotificationsBell placement="up" />
        <ProfileMenu variant="sidebar" collapsed />
      </div>
    );
  }

  return (
    <div className="space-y-1 border-t border-sidebar-border px-2 py-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={openAssistant}
          title={t("openTitle")}
          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span className="truncate">{t("open")}</span>
        </button>
        <ThemeToggle theme={theme} />
      </div>
      <div className="flex items-center gap-1">
        <ProfileMenu variant="sidebar" />
        <NotificationsBell placement="up" />
      </div>
    </div>
  );
}
