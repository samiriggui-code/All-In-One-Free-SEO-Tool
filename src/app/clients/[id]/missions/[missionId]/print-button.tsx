"use client";

import { Printer } from "lucide-react";

/** The browser's print dialog, which also saves as PDF. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="gsk-btn gsk-btn--primary" onClick={() => window.print()}>
      <Printer className="size-4" />
      {label}
    </button>
  );
}
