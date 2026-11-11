"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * GsKnora's SettingDrawer: the settings window only shows values; adding or
 * changing anything opens this sheet from the right, with the steps, the
 * fields, and Cancel / Save in a footer. Styles in ./settings-window.css.
 *
 * Children are the sheet's content: a `.gsk-drawer__body` and a
 * `.gsk-drawer__footer`, usually wrapped in a <form className="gsk-sheet-form">.
 */
export function GskSheet({
  title,
  subtitle,
  icon,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** A small glyph or initials in the brand-tinted badge. */
  icon?: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Capture phase + preventDefault: the settings window listens for
      // Escape too, and must not close under the sheet.
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <>
      <div className="gsk-drawer-mask" onMouseDown={onClose} />
      <aside className="gsk-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="gsk-drawer__header">
          {icon ? <span className="gsk-drawer__icon">{icon}</span> : null}
          <div className="min-w-0 flex-1">
            <div className="gsk-drawer__title">{title}</div>
            {subtitle ? <div className="gsk-drawer__subtitle">{subtitle}</div> : null}
          </div>
          <button type="button" className="gsk-drawer__close" aria-label={closeLabel} onClick={onClose}>
            <X className="size-5" />
          </button>
        </header>
        {children}
      </aside>
    </>
  );
}

/** One read-only row of the window: label + hint on the left, value on the right. */
export function ValueRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="gsk-row">
      <div className="gsk-row-info">
        <span className="gsk-row-label">{label}</span>
        {hint ? <p className="gsk-row-desc">{hint}</p> : null}
      </div>
      <div className="gsk-row-control gsk-value">{children}</div>
    </div>
  );
}

/** A field inside a sheet: label on top, control, optional help. */
export function SheetField({
  label,
  htmlFor,
  help,
  children,
}: {
  label: string;
  htmlFor?: string;
  help?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="gsk-sheet-field">
      <label className="gsk-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {help ? <p className="gsk-help">{help}</p> : null}
    </div>
  );
}

/** A switch inside a sheet: label and help on the left, switch on the right. */
export function SheetSwitch({
  label,
  help,
  name,
  defaultChecked,
  value,
}: {
  label: string;
  help?: string;
  name: string;
  defaultChecked: boolean;
  /** Submitted value when on (the browser default is "on"). */
  value?: string;
}) {
  return (
    <label className="gsk-sheet-switch">
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{label}</span>
        {help ? <span className="gsk-help mt-0.5 block">{help}</span> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="gsk-switch"
      />
    </label>
  );
}
