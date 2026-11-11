"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, Pencil, Upload } from "lucide-react";
import { saveBrand, clearLogo, type BrandActionResult } from "./brand-actions";
import { GskSheet, SheetField, ValueRow } from "./gsk-sheet";

/*
 * GsKnora's principle: the settings window shows the values; changing them
 * happens in a sheet from the right (gsk-sheet.tsx). Same fields and server
 * action as before.
 */

type Brand = {
  initialName: string | null;
  initialColor: string | null;
  initialLogoDataUrl: string | null;
  initialTagline?: string | null;
  initialWebsite?: string | null;
  initialEmail?: string | null;
  initialPhone?: string | null;
  initialFooterText?: string | null;
};

export function BrandForm(props: Brand) {
  const t = useTranslations("settings.brandForm");
  const [editing, setEditing] = useState(false);
  const empty = <span className="gsk-value--muted">{t("notSet")}</span>;

  return (
    <>
      <section className="gsk-block">
        <div className="gsk-block-head gsk-block-head--action">
          <div>
            <h2 className="gsk-block-title">{t("identityTitle")}</h2>
            <p className="gsk-block-description">{t("identityHint")}</p>
          </div>
          <button type="button" className="gsk-btn" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            {t("edit")}
          </button>
        </div>
        <ValueRow label={t("name")} hint={t("nameHint")}>
          {props.initialName || empty}
        </ValueRow>
        <ValueRow label={t("color")} hint={t("colorHint")}>
          {props.initialColor ? (
            <span className="inline-flex items-center gap-2 font-mono text-[13px]">
              <span className="gsk-swatch" style={{ background: props.initialColor }} />
              {props.initialColor}
            </span>
          ) : (
            empty
          )}
        </ValueRow>
        <ValueRow label={t("logo")} hint={t("logoHint")}>
          {props.initialLogoDataUrl ? (
            <span className="flex h-10 items-center rounded-[3px] border border-[var(--gsk-stroke)] bg-white px-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.initialLogoDataUrl} alt={t("logoAlt")} className="max-h-7 max-w-[120px] object-contain" />
            </span>
          ) : (
            empty
          )}
        </ValueRow>
        <ValueRow label={t("tagline")} hint={t("taglineHint")}>
          {props.initialTagline || empty}
        </ValueRow>
      </section>

      <section className="gsk-block">
        <div className="gsk-block-head">
          <h2 className="gsk-block-title">{t("contactTitle")}</h2>
          <p className="gsk-block-description">{t("contactHint")}</p>
        </div>
        <ValueRow label={t("email")}>{props.initialEmail || empty}</ValueRow>
        <ValueRow label={t("phone")}>{props.initialPhone || empty}</ValueRow>
        <ValueRow label={t("website")}>{props.initialWebsite || empty}</ValueRow>
        <ValueRow label={t("footer")} hint={t("footerHint")}>
          {props.initialFooterText || empty}
        </ValueRow>
      </section>

      {editing ? <BrandSheet {...props} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

function BrandSheet({ onClose, ...b }: Brand & { onClose: () => void }) {
  const t = useTranslations("settings.brandForm");
  const router = useRouter();
  const [color, setColor] = useState(b.initialColor ?? "#0a6fa8");
  const [logo, setLogo] = useState(b.initialLogoDataUrl ?? "");
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<BrandActionResult | null, FormData>(
    saveBrand,
    null,
  );

  // Saved: refresh the values shown in the window and close the sheet.
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  const handleFile = (file: File) => {
    setLogoErr(null);
    if (file.size > 500_000) return setLogoErr(t("logoTooBig"));
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/i.test(file.type)) return setLogoErr(t("logoBadType"));
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result ?? ""));
    reader.onerror = () => setLogoErr(t("logoReadError"));
    reader.readAsDataURL(file);
  };

  return (
    <GskSheet
      title={t("sheetTitle")}
      subtitle={t("sheetSubtitle")}
      icon={<Pencil className="size-4" />}
      closeLabel={t("cancel")}
      onClose={onClose}
    >
      <form action={formAction} className="gsk-sheet-form">
        <input type="hidden" name="logoDataUrl" value={logo} />
        <div className="gsk-drawer__body">
          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("identityTitle")}</h4>
            <SheetField label={t("name")} htmlFor="brand-name" help={t("nameHint")}>
              <input
                id="brand-name"
                name="name"
                defaultValue={b.initialName ?? ""}
                placeholder={t("namePlaceholder")}
                maxLength={80}
                className="gsk-input"
              />
            </SheetField>
            <SheetField label={t("color")} htmlFor="brand-color" help={t("colorHint")}>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label={t("color")}
                  className="h-8 w-10 cursor-pointer rounded-[3px] border border-[var(--gsk-border)] bg-transparent p-0.5"
                />
                <input
                  id="brand-color"
                  name="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  maxLength={7}
                  pattern="^#[0-9a-fA-F]{6}$"
                  className="gsk-input gsk-mono w-[120px]"
                />
              </div>
            </SheetField>
            <SheetField label={t("logo")} help={logoErr ? undefined : t("logoHint")}>
              <div className="flex flex-wrap items-center gap-2">
                {logo ? (
                  <span className="flex h-10 items-center rounded-[3px] border border-[var(--gsk-stroke)] bg-white px-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt={t("logoAlt")} className="max-h-7 max-w-[140px] object-contain" />
                  </span>
                ) : null}
                <button type="button" className="gsk-btn" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" />
                  {logo ? t("logoReplace") : t("logoUpload")}
                </button>
                {logo ? (
                  <button
                    type="button"
                    className="gsk-btn gsk-btn--danger-text"
                    onClick={async () => {
                      setLogo("");
                      await clearLogo();
                    }}
                  >
                    {t("logoRemove")}
                  </button>
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
              </div>
              {logoErr ? <p className="gsk-help gsk-status-error">{logoErr}</p> : null}
            </SheetField>
            <SheetField label={t("tagline")} htmlFor="brand-tagline" help={t("taglineHint")}>
              <input
                id="brand-tagline"
                name="tagline"
                defaultValue={b.initialTagline ?? ""}
                placeholder={t("taglinePlaceholder")}
                maxLength={120}
                className="gsk-input"
              />
            </SheetField>
          </div>

          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("contactTitle")}</h4>
            <div className="gsk-sheet-grid">
              <SheetField label={t("email")} htmlFor="brand-email">
                <input
                  id="brand-email"
                  name="email"
                  type="email"
                  defaultValue={b.initialEmail ?? ""}
                  placeholder="contact@votre-agence.fr"
                  maxLength={200}
                  className="gsk-input"
                />
              </SheetField>
              <SheetField label={t("phone")} htmlFor="brand-phone">
                <input
                  id="brand-phone"
                  name="phone"
                  defaultValue={b.initialPhone ?? ""}
                  placeholder="+33 1 23 45 67 89"
                  maxLength={40}
                  className="gsk-input"
                />
              </SheetField>
            </div>
            <SheetField label={t("website")} htmlFor="brand-website">
              <input
                id="brand-website"
                name="website"
                defaultValue={b.initialWebsite ?? ""}
                placeholder="https://votre-agence.fr"
                maxLength={200}
                className="gsk-input"
              />
            </SheetField>
            <SheetField label={t("footer")} htmlFor="brand-footer" help={t("footerHint")}>
              <input
                id="brand-footer"
                name="footerText"
                defaultValue={b.initialFooterText ?? ""}
                placeholder={t("footerPlaceholder")}
                maxLength={200}
                className="gsk-input"
              />
            </SheetField>
          </div>
        </div>

        <footer className="gsk-drawer__footer">
          <p className="m-0 min-w-0 text-[13px]">
            {state && !state.ok ? (
              <span className="gsk-status-error inline-flex items-center gap-1.5">
                <AlertCircle className="size-4" />
                {state.error}
              </span>
            ) : (
              <span className="text-[var(--gsk-text-2)]">{t("footerNote")}</span>
            )}
          </p>
          <div className="gsk-drawer__footer-right">
            <button type="button" className="gsk-btn" onClick={onClose}>
              {t("cancel")}
            </button>
            <button type="submit" disabled={pending} className="gsk-btn gsk-btn--primary">
              {pending ? t("saving") : t("saveClose")}
            </button>
          </div>
        </footer>
      </form>
    </GskSheet>
  );
}
