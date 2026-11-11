import { CheckCircle2 } from "lucide-react";

/**
 * Building blocks of a settings section, styled like GsKnora's
 * settings-section.less (classes in ./settings-window.css): a 20px title
 * and one sentence, then groups of rows, label and hint on the left, the
 * control on the right.
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
    <header className="gsk-section-header">
      <h1>
        {title}
        {status ? <StatusPill {...status} /> : null}
      </h1>
      {description ? <p className="gsk-section-description">{description}</p> : null}
    </header>
  );
}

export function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return ok ? (
    <span className="gsk-tag gsk-tag--success">
      <CheckCircle2 className="size-3" />
      {label}
    </span>
  ) : (
    <span className="gsk-tag gsk-tag--default">{label}</span>
  );
}

/** A group of related settings, under its own heading. */
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
    <section id={id} className="gsk-block scroll-mt-6">
      {title || description ? (
        <div className="gsk-block-head">
          {title ? <h2 className="gsk-block-title">{title}</h2> : null}
          {description ? <p className="gsk-block-description">{description}</p> : null}
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
    <div className="gsk-row">
      <div className="gsk-row-info">
        <span className="gsk-row-label">{label}</span>
        {description ? <p className="gsk-row-desc">{description}</p> : null}
      </div>
      <div className="gsk-row-control">{children}</div>
    </div>
  );
}

export function OwnerOnly({ children }: { children: React.ReactNode }) {
  return <p className="gsk-note">{children}</p>;
}
