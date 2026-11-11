"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  Heart,
  HelpCircle,
  Library,
  LogIn,
  LogOut,
  Palette,
  RefreshCw,
  Settings,
  Sparkles,
  Users2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { REPO_URL } from "@/lib/repo";

type AuthStatus = {
  enabled: boolean;
  mode: "accounts" | "password" | "open";
  user: { id: number; name: string | null; email: string; role: string } | null;
};

/**
 * The one account menu. Who you are, the shortcuts into the settings
 * window, help and resources, sign out.
 *
 * Account things used to be spread over four places: this menu (seven
 * settings links, most with the same icon), a user block at the bottom of
 * the sidebar that also opened settings, a guided/pro switch under it that
 * duplicated the one in this top bar, and an "Account" group in the
 * sidebar (get started, settings, docs, learn, knowledge). They are all
 * here now, grouped the way GsKnora's user menu groups them.
 */
export function ProfileMenu() {
  const pathname = usePathname();
  const t = useTranslations("shell.profile");
  const tRoles = useTranslations("auth.roles");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const onLoginScreen = pathname === "/login" || pathname === "/register";

  // Who am I, and is there anything to sign out of? On a solo install
  // the answer is "nobody" and "no", and the menu says so rather than
  // offering a Sign out button that would do nothing.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: AuthStatus) => {
        if (!cancelled) setStatus(j);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const authEnabled = Boolean(status?.enabled);
  const me = status?.user ?? null;
  // Admin links are hidden only from someone signed out of a workspace
  // with accounts. A solo or shared-password install has nobody to sign
  // in as, and there the menu is the way into Settings.
  const signedOut = status?.mode === "accounts" && !me;
  // Workspace administration is the owner's (see lib/permissions.ts);
  // without accounts there is nobody else, so the menu shows it all.
  // Until the status has loaded (or if it fails) nobody is assumed to
  // be the owner.
  const isOwner = status !== null && !signedOut && (!me || me.role === "owner");
  const isViewer = me?.role === "viewer";
  const canOpenSettings = isOwner || (me !== null && !isViewer);
  const initial = (me?.name || me?.email || "P").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    // Full load on purpose: it drops every piece of signed-in client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above
    window.location.href = "/login";
  }

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("menu")}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm ring-2 ring-transparent transition hover:ring-primary/30"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-50 max-h-[calc(100dvh-4rem)] w-72 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
        >
          {/* Who */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {me?.name || me?.email || t("appName")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {me
                  ? `${me.email} · ${tRoles.has(me.role) ? tRoles(me.role) : me.role}`
                  : status?.mode === "accounts"
                    ? onLoginScreen
                      ? t("signInBelow")
                      : t("notSignedIn")
                    : status?.mode === "password"
                      ? t("sharedPassword")
                      : t("localSingleUser")}
              </p>
            </div>
          </div>
          <p className="flex items-center gap-1.5 border-b border-border px-4 pb-2.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {t("selfHosted")}
          </p>

          {/* Settings */}
          {canOpenSettings ? (
            <MenuGroup>
              <MenuLink href="/settings" icon={Settings} onClick={close}>
                {t("settings")}
              </MenuLink>
              {isOwner ? (
                <>
                  <MenuLink href="/settings/ai" icon={Sparkles} onClick={close}>
                    {t("aiConnection")}
                  </MenuLink>
                  <MenuLink href="/settings/team" icon={Users2} onClick={close}>
                    {me ? t("team") : t("setUpTeam")}
                  </MenuLink>
                  <MenuLink href="/settings/brand" icon={Palette} onClick={close}>
                    {t("brand")}
                  </MenuLink>
                  <MenuLink href="/settings/updates" icon={RefreshCw} onClick={close}>
                    {t("updates")}
                  </MenuLink>
                </>
              ) : null}
            </MenuGroup>
          ) : !me && onLoginScreen ? (
            <p className="border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground">
              {t("adminAfterSignIn")}
            </p>
          ) : null}

          {/* Help and resources */}
          <MenuGroup label={t("helpGroup")}>
            <MenuLink href="/welcome" icon={Sparkles} onClick={close}>
              {t("getStarted")}
            </MenuLink>
            <MenuLink href="/docs" icon={BookOpen} onClick={close}>
              {t("docs")}
            </MenuLink>
            <MenuLink href="/learn" icon={GraduationCap} onClick={close}>
              {t("learn")}
            </MenuLink>
            <MenuLink href="/knowledge" icon={Library} onClick={close}>
              {t("knowledge")}
            </MenuLink>
            <MenuLink href="/seo-chat/capabilities" icon={HelpCircle} onClick={close}>
              {t("chatCapabilities")}
            </MenuLink>
            <MenuLink href="/automations/overview" icon={Workflow} onClick={close}>
              {t("automated")}
            </MenuLink>
          </MenuGroup>

          {/* About */}
          <MenuGroup>
            <MenuLink href="/about" icon={Heart} onClick={close}>
              {t("about")}
            </MenuLink>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="size-4 text-muted-foreground" />
              {t("repo")}
            </a>
          </MenuGroup>

          {/* Session */}
          {signedOut && !onLoginScreen ? (
            <div className="py-1">
              {/* A plain link on purpose: the sign-in page has its own frame,
                  and a client-side navigation would keep the app shell. */}
              <a
                href="/login"
                role="menuitem"
                className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-accent"
              >
                <LogIn className="size-4 text-muted-foreground" />
                {t("signIn")}
              </a>
            </div>
          ) : authEnabled ? (
            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                {me ? t("signOut") : t("signOutPassword")}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function MenuGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-1 last:border-b-0">
      {label ? (
        <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  onClick,
  children,
}: {
  href: string;
  icon: LucideIcon;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </Link>
  );
}
