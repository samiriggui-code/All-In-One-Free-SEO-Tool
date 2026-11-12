"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ExternalLink,
  Heart,
  LogIn,
  LogOut,
  Palette,
  Settings,
  Sparkles,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { REPO_URL } from "@/lib/repo";
import { UserAvatar } from "./user-avatar";

type AuthStatus = {
  enabled: boolean;
  mode: "accounts" | "password" | "open";
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    avatarUrl?: string | null;
  } | null;
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
/**
 * `variant="sidebar"`: GsKnora's user bar at the bottom of the sidebar
 * (avatar, name, email; the menu opens upwards). `collapsed` keeps only
 * the avatar, for the narrow rail. The default is the round avatar of the
 * top bar, still used on phones where the sidebar is hidden.
 */
export function ProfileMenu({
  variant = "header",
  collapsed = false,
}: { variant?: "header" | "sidebar"; collapsed?: boolean } = {}) {
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
    const load = () =>
      fetch("/api/auth/status", { cache: "no-store" })
        .then((r) => r.json())
        .then((j: AuthStatus) => {
          if (!cancelled) setStatus(j);
        })
        .catch(() => {
          if (!cancelled) setStatus(null);
        });
    void load();
    // My profile fires this after a new photo or name.
    window.addEventListener("profile-updated", load);
    return () => {
      cancelled = true;
      window.removeEventListener("profile-updated", load);
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
  const displayName = me?.name || me?.email || null;

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
    <div ref={ref} className={variant === "sidebar" && !collapsed ? "relative min-w-0 flex-1" : "relative"}>
      {variant === "sidebar" && !collapsed ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={t("menu")}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex w-full min-w-0 items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
        >
          <UserAvatar src={me?.avatarUrl} name={displayName} className="size-8 text-xs" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-sidebar-foreground">
              {me?.name || me?.email || t("appName")}
            </span>
            <span className="block truncate text-[11px] text-sidebar-foreground/60">
              {me ? me.email : status?.mode === "password" ? t("sharedPassword") : t("localSingleUser")}
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={t("menu")}
          title={collapsed ? me?.name || me?.email || t("menu") : undefined}
          aria-expanded={open}
          aria-haspopup="menu"
          className="rounded-full shadow-sm ring-2 ring-transparent transition hover:ring-primary/30"
        >
          <UserAvatar src={me?.avatarUrl} name={displayName} className="size-8 text-xs" />
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={`absolute z-50 w-72 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl ${
            variant === "sidebar"
              ? "bottom-full left-0 mb-2 max-h-[calc(100dvh-6rem)]"
              : "right-0 top-10 max-h-[calc(100dvh-4rem)]"
          }`}
        >
          {/* Who: with an account, a click opens My profile (as in GsKnora). */}
          <WhoBlock
            href={me && !isViewer ? "/settings/profile" : null}
            title={me ? t("openProfile") : undefined}
            onClick={close}
          >
            <UserAvatar src={me?.avatarUrl} name={displayName} className="size-9 text-sm" />
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
          </WhoBlock>
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
                </>
              ) : null}
            </MenuGroup>
          ) : !me && onLoginScreen ? (
            <p className="border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground">
              {t("adminAfterSignIn")}
            </p>
          ) : null}

          {/* Help and resources */}
          <MenuGroup>
            <MenuLink href="/docs" icon={BookOpen} onClick={close}>
              {t("help")}
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

/** The name block at the top of the menu: a link to My profile when there is one. */
function WhoBlock({
  href,
  title,
  onClick,
  children,
}: {
  href: string | null;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const className = "flex items-center gap-3 px-4 py-3";
  if (!href) return <div className={className}>{children}</div>;
  return (
    <Link
      href={href}
      role="menuitem"
      title={title}
      onClick={onClick}
      className={`${className} transition-colors hover:bg-accent`}
    >
      {children}
    </Link>
  );
}
