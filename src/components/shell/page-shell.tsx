import { cn } from "@/lib/utils";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Vertical rhythm between sections (default space-y-6). */
  spacing?: "6" | "8";
};

/**
 * Standard page width wrapper. Uses full main column on md+; mobile keeps
 * layout padding from the root shell. Prefer this over ad-hoc max-w-* on
 * new pages.
 */
export function PageShell({
  children,
  className,
  spacing = "6",
}: PageShellProps) {
  return (
    <div
      className={cn(
        "page-shell",
        spacing === "8" ? "space-y-8" : "space-y-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
