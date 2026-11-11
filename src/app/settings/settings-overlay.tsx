"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/** Written by the sidebar on every page outside /settings. */
export const LAST_PAGE_KEY = "seo:last-page";

function lastPage(): string {
  try {
    const v = sessionStorage.getItem(LAST_PAGE_KEY);
    return v && v.startsWith("/") && !v.startsWith("/settings") ? v : "/";
  } catch {
    return "/";
  }
}

/**
 * GsKnora's modal shell: dimmed backdrop, centred window. Escape, a click on
 * the backdrop or the close button go back to the page the window was
 * opened from.
 */
export function SettingsOverlay({
  closeLabel,
  children,
}: {
  closeLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const close = useCallback(() => router.push(lastPage()), [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Leave Escape to whatever dialog or menu is open inside the window.
      if (document.querySelector("[role=dialog][data-state=open], [role=menu]")) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      className="gsk-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="gsk-modal" role="dialog" aria-modal="true" aria-labelledby="gsk-title">
        <button type="button" aria-label={closeLabel} className="gsk-close" onClick={close}>
          <X className="size-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
