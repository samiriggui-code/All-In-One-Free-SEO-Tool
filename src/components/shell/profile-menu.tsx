"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  HelpCircle,
  RefreshCw,
  Info,
  LogOut,
  ExternalLink,
  Heart,
  Users2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { REPO_URL } from "@/lib/repo";

type AuthStatus = {
  enabled: boolean;
  mode: "accounts" | "password" | "open";
  user: { id: number; name: string | null; email: string; role: string } | null;
};


/**
 * Profile dropdown — replaces the previous static "P" avatar that did
 * nothing on click. Hosts Settings, About, Update, Help, Team, and (when
 * there is anything to sign out of) Sign out.
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
  const initial = (me?.name || me?.email || "P").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("menu")}
        className="relative size-8 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 grid place-items-center text-xs font-semibold text-white shadow-lg shadow-violet-500/40 ring-1 ring-inset ring-white/30 transition-transform hover:scale-105"
      >
        <span className="relative">{initial}</span>
        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent opacity-50" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-60 overflow-hidden rounded-xl border border-white/10 bg-card/95 shadow-2xl shadow-violet-500/10 backdrop-blur-xl">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="truncate text-xs font-semibold">
              {me?.name || me?.email || t("appName")}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
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
          <div className="flex flex-col py-1">
            {isOwner ? (
              <>
                <Link
                  href="/settings/team"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
                >
                  <Users2 className="size-3.5 text-muted-foreground" />
                  {me ? t("team") : t("setUpTeam")}
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  {t("settings")}
                </Link>
                <Link
                  href="/settings#ai"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  {t("aiKeys")}
                </Link>
                <Link
                  href="/settings#update"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
                >
                  <RefreshCw className="size-3.5 text-muted-foreground" />
                  {t("updates")}
                </Link>
                <Link
                  href="/settings/health"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  {t("health")}
                </Link>
                <Link
                  href="/settings/errors"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  {t("errors")}
                </Link>
                <Link
                  href="/settings/backup"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  {t("backup")}
                </Link>
              </>
            ) : me && !isViewer ? (
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
              >
                <Settings className="size-3.5 text-muted-foreground" />
                {t("settings")}
              </Link>
            ) : me ? null : onLoginScreen ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                {t("adminAfterSignIn")}
              </p>
            ) : (
              // A plain link on purpose: the sign-in page has its own frame,
              // and a client-side navigation would keep the app shell.
              <a
                href="/login"
                className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
              >
                <Settings className="size-3.5 text-muted-foreground" />
                {t("signIn")}
              </a>
            )}
            <Link
              href="/seo-chat/capabilities"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
            >
              <HelpCircle className="size-3.5 text-muted-foreground" />
              {t("chatCapabilities")}
            </Link>
            <Link
              href="/automations/overview"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
            >
              <Info className="size-3.5 text-muted-foreground" />
              {t("automated")}
            </Link>
            <div className="my-1 border-t border-white/[0.06]" />
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
            >
              <Heart className="size-3.5 text-rose-300" />
              {t("about")}
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
            >
              <ExternalLink className="size-3.5 text-muted-foreground" />
              {t("repo")}
            </a>
            {authEnabled && (
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10"
              >
                <LogOut className="size-3.5" />
                {me ? t("signOut") : t("signOutPassword")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
