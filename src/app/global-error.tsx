"use client";

/**
 * Root-level error boundary. Fires only when even the root layout fails
 * to render — that bypasses error.tsx. Must render its own <html> and
 * <body>; no Tailwind tokens here since the root CSS may not be loaded.
 *
 * Kept minimal: brief recovery options and a copy-error button. Most
 * users will never see this. When they do, the regular error boundary
 * already proved insufficient, so we keep this dead-simple.
 */

import { useEffect, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};
/** The interface language, read from its cookie: no provider survives here. */
const cookieSaysEnglish = () => /(^|; )NEXT_LOCALE=en/.test(document.cookie);

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // French unless the visitor chose English, as everywhere else.
  const en = useSyncExternalStore(noSubscribe, cookieSaysEnglish, () => false);
  const t = (english: string, french: string) => (en ? english : french);

  useEffect(() => {
    fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context: "global-error-boundary",
        url: typeof window !== "undefined" ? location.href : null,
        digest: error.digest ?? null,
      }),
    }).catch(() => undefined);
  }, [error]);

  async function copyDetails() {
    const text = [
      `Error: ${error.message}`,
      error.digest ? `Digest: ${error.digest}` : "",
      `URL: ${typeof window !== "undefined" ? location.href : "n/a"}`,
      "",
      error.stack ?? "(no stack)",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <html lang={en ? "en" : "fr"}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          backgroundColor: "#0d0e10",
          color: "#e6e7ea",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 560, margin: "10vh auto" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 500,
              color: "#fca5a5",
              backgroundColor: "rgba(244,63,94,0.1)",
              border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: 6,
            }}
          >
            {t("Critical error — root layout couldn't load", "Erreur critique : l’application n’a pas pu s’afficher")}
          </div>
          <h1
            style={{
              marginTop: 12,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {t("Something went badly wrong.", "Une erreur grave s’est produite.")}
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "#a1a1aa",
              lineHeight: 1.55,
            }}
          >
            {t(
              "The app's root failed to render — usually means a freshly broken build or a missing dependency after an update. Try the options below in order.",
              "La base de l’application n’a pas pu s’afficher. Essayez les solutions ci-dessous, dans l’ordre.",
            )}
          </p>

          <pre
            style={{
              marginTop: 16,
              padding: 10,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              color: "#d4d4d8",
              background: "#18191c",
              border: "1px solid #2a2b2f",
              borderRadius: 6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message || t("Unknown error", "Erreur inconnue")}
          </pre>

          <ol
            style={{
              marginTop: 20,
              paddingLeft: 22,
              fontSize: 13,
              lineHeight: 1.7,
              color: "#d4d4d8",
            }}
          >
            {en ? (
              <>
                <li>Try again — sometimes it&apos;s transient.</li>
                <li>
                  Reload the page (
                  <kbd
                    style={{
                      fontFamily: "monospace",
                      background: "#26272b",
                      padding: "1px 5px",
                      borderRadius: 3,
                      fontSize: 11,
                    }}
                  >
                    Ctrl/Cmd + R
                  </kbd>
                  ).
                </li>
                <li>
                  Stop the dev server (Ctrl+C in your terminal) and run{" "}
                  <code
                    style={{
                      fontFamily: "monospace",
                      background: "#26272b",
                      padding: "1px 5px",
                      borderRadius: 3,
                      fontSize: 11,
                    }}
                  >
                    pnpm install
                  </code>{" "}
                  then{" "}
                  <code
                    style={{
                      fontFamily: "monospace",
                      background: "#26272b",
                      padding: "1px 5px",
                      borderRadius: 3,
                      fontSize: 11,
                    }}
                  >
                    pnpm dev
                  </code>{" "}
                  — fixes missing-dependency errors after an update.
                </li>
                <li>
                  Open an issue with the copied details below — that gives the
                  maintainer enough to fix it fast.
                </li>
              </>
            ) : (
              <>
                <li>Réessayez : l’erreur est parfois passagère.</li>
                <li>
                  Rechargez la page (
                  <kbd
                    style={{
                      fontFamily: "monospace",
                      background: "#26272b",
                      padding: "1px 5px",
                      borderRadius: 3,
                      fontSize: 11,
                    }}
                  >
                    Ctrl/Cmd + R
                  </kbd>
                  ).
                </li>
                <li>
                  Si l’erreur persiste, copiez les détails ci-dessous et
                  transmettez-les à la personne qui gère l’application.
                </li>
              </>
            )}
          </ol>

          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: "#fff",
                background: "#0b7fae",
                border: "1px solid #6e7adc",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {t("Try again", "Réessayer")}
            </button>
            <button
              type="button"
              onClick={() => location.reload()}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                color: "#e6e7ea",
                background: "#18191c",
                border: "1px solid #2a2b2f",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {t("Hard reload", "Recharger la page")}
            </button>
            <button
              type="button"
              onClick={copyDetails}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                color: "#a1a1aa",
                background: "transparent",
                border: "1px solid #2a2b2f",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {t("Copy details", "Copier les détails")}
            </button>
          </div>

          {error.digest && (
            <div
              style={{ marginTop: 18, fontSize: 11, color: "#71717a" }}
            >
              {t("Error ID:", "Identifiant de l’erreur :")}{" "}
              <code style={{ fontFamily: "monospace" }}>{error.digest}</code>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
