import { CheckCircle2 } from "lucide-react";

/**
 * Building blocks of a settings section, so every section of the window
 * reads the same way: a title and one sentence, then blocks of related
 * settings separated by thin rules.
 */

export function SectionHeader({
  title,
  description,
  status,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Short state shown next to the title: connected, configured… */
  status?: { label: string; ok: boolean } | null;
}) {
  return (
    <header className="pr-10">
      <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
        {title}
        {status ? <StatusPill {...status} /> : null}
      </h1>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}

export function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
      <CheckCircle2 className="size-3" />
      {label}
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border">
      {label}
    </span>
  );
}

/** A group of related settings, under its own small heading. */
export function SettingsBlock({
  title,
  description,
  children,
  id,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-border pt-6 first:border-t-0 first:pt-0">
      {title ? (
        <div className="mb-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Label and explanation on the left, the control on the right. */
export function SettingRow({
  label,
  description,
  children,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function OwnerOnly({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}
