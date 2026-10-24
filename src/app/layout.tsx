import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";
import { Sidebar } from "@/components/shell/sidebar";
import { NeedsKeyBanner } from "@/components/shell/needs-key-banner";
import { IntlProvider } from "@/components/shell/intl-provider";
import { getAiAvailability } from "@/lib/ai-availability";
import { TopBar } from "@/components/shell/top-bar";
import { AIAssistant } from "@/components/shell/ai-assistant";
import { PowerWidget } from "@/components/shell/power-widget";
import { FirstRunPrompt } from "@/components/shell/first-run-prompt";
import { Toaster } from "@/components/shell/toaster";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { ServiceWorkerRegister } from "@/components/shell/sw-register";
import { ClientErrorCapture } from "@/components/shell/client-error-capture";
import { QuickAddClientProvider } from "@/components/shell/quick-add-client-dialog";
import { ShortcutsHelpHotkey } from "@/components/shell/shortcuts-help-hotkey";
import { getUnreadCounts } from "@/lib/unread-counts";
import { redirect } from "next/navigation";
import {
  accountsEnabled,
  currentUser,
  effectiveRole,
  visibleClientIds,
} from "@/lib/auth";
import { isAuthPage, isPublicPage, PATHNAME_HEADER, RETURN_TO_HEADER } from "@/lib/auth-routes";
import { AuthShell } from "@/components/auth/auth-shell";
import { getUiMode } from "./settings/ui-actions";
import { getThemePreference } from "./settings/theme-actions";
import "./globals.css";

// Inter is warmer + more readable at small sizes than Geist's precise grotesk.
// Same web-safe quality; same variable-weight support.
const sansFont = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const monoFont = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "rank_forge",
  description: "Self-hosted SEO platform — free, modern, beginner-friendly.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "rank_forge",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b7fae",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch unread counts so the sidebar can render badges next to sections
  // with new content. Failure is non-fatal — empty counts = no badges.
  let unreadByHref: Record<string, number> = {};
  try {
    const u = await getUnreadCounts(
      await visibleClientIds(await currentUser()),
    );
    unreadByHref = {
      "/news": u.news,
      "/agent": u.suggestions,
      "/monitor": u.pageChanges,
      "/settings": u.updateAvailable,
    };
  } catch {
    unreadByHref = {};
  }

  const uiMode = await getUiMode();
  const me = await currentUser().catch(() => null);
  const userRole = me?.role ?? null;

  // Server-side embed detection. The middleware sees ?embed=1 in the
  // request URL and forwards it as an x-embed header (see
  // src/middleware.ts). When set, we render a minimal shell — no
  // sidebar, no top-bar, no floating widgets — so the per-client tool
  // drawer's iframe shows ONLY the tool content. No client script, no
  // flash, no late hydration.
  const requestHeaders = await headers();
  const isEmbed = requestHeaders.get("x-embed") === "1";
  const pathname = requestHeaders.get(PATHNAME_HEADER) ?? "";
  const onAuthPage = isAuthPage(pathname);

  // Middleware only proves the session cookie is authentic. Whether its
  // user still exists, is still active and has not changed password is
  // only knowable here, and `currentUser()` answers null when any of
  // that fails. That null used to fall through to "solo install": the
  // shell rendered as "Local user" with every tool and every client.
  // With accounts on, null means signed out, so go and sign in.
  // Not `isEmbed`: `?embed=1` only hides the shell, and any page accepts
  // it, so it would let a revoked session read any page shell-less.
  if (accountsEnabled() && !me && !onAuthPage && !isPublicPage(pathname)) {
    const returnTo = requestHeaders.get(RETURN_TO_HEADER) ?? pathname;
    const next = returnTo && returnTo !== "/" ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${next}`);
  }

  // Theme. `dark` used to be hardcoded here, which made the whole app
  // dark-only with no toggle and no way to follow the OS preference —
  // awkward in a bright office, and worse on the client-facing portal.
  //
  // "system" can only be resolved in the browser, so the class is
  // applied by the inline script below before first paint. Explicit
  // light/dark is resolved here on the server, which avoids the flash
  // entirely for users who have chosen one.
  const theme = await getThemePreference();
  const locale = await getLocale();
  const messages = await getMessages();
  const timeZone = await getTimeZone();

  // Read once here rather than in each page that needs a model. Failure
  // is non-fatal: no banner is better than a broken shell.
  const aiAvailability = await getAiAvailability().catch(() => ({
    available: false,
    hasKey: false,
    hasSubscription: false,
    client: null,
  }));

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-ui-mode={uiMode}
      data-theme={theme}
      data-embed={isEmbed ? "1" : undefined}
      className={`${theme === "dark" ? "dark" : ""} ${sansFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <head>
        {/*
          Runs before first paint, so a "system" user never sees a
          white flash before the dark class lands (or vice versa).
          Deliberately tiny and dependency-free — it blocks rendering.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=document.documentElement.dataset.theme;if(t==="system"){var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={
          onAuthPage
            ? "min-h-dvh bg-background text-foreground"
            : "h-screen overflow-hidden bg-background text-foreground"
        }
      >
        <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
          <ConfirmDialogProvider>
            <QuickAddClientProvider>
              {onAuthPage ? (
                // Sign-in screens get their own branded frame. Nothing
                // of the app (sidebar, top bar, assistant) is rendered
                // for someone who has not signed in yet.
                <AuthShell>{children}</AuthShell>
              ) : isEmbed ? (
                // Minimal embedded shell — just the page content. The
                // host (drawer) owns the chrome.
                <main className="h-full overflow-y-auto p-4 md:p-6">
                  {children}
                </main>
              ) : (
                <>
                  <div className="flex h-full">
                    <Sidebar
                      unreadByHref={unreadByHref}
                      uiMode={uiMode}
                      hasAiKey={aiAvailability.hasKey}
                      userRole={userRole}
                      user={me ? { name: me.name, email: me.email } : null}
                      authMode={
                        accountsEnabled()
                          ? "accounts"
                          : process.env.APP_PASSWORD
                            ? "password"
                            : "open"
                      }
                    />
                    <div className="flex h-full min-w-0 flex-1 flex-col">
                      <TopBar
                        unreadByHref={unreadByHref}
                        theme={theme}
                        userRole={userRole}
                      />
                      <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-24 sm:p-4 sm:pb-20 md:p-5 md:pb-6 lg:p-6 xl:px-8">
                        {/* One place, so all 38 AI pages say the same thing
                            — and /agent, /blog and the assistant too, not
                            only /tools/*. */}
                        <NeedsKeyBanner
                          hasKey={aiAvailability.hasKey}
                          hasSubscription={aiAvailability.hasSubscription}
                          client={aiAvailability.client}
                        />
                        {children}
                      </main>
                    </div>
                  </div>
                  <AIAssistant />
                  {/* Restart / stop are owner-only routes; nobody else
                      gets a button that can only fail. */}
                  {effectiveRole(me) === "owner" && <PowerWidget />}
                  <FirstRunPrompt />
                </>
              )}
              <Toaster />
              <ServiceWorkerRegister />
              <ClientErrorCapture />
              <ShortcutsHelpHotkey />
            </QuickAddClientProvider>
          </ConfirmDialogProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
