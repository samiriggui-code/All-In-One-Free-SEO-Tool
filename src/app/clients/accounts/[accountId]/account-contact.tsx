"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, Building2, Pencil } from "lucide-react";
import { GskSheet, SheetField, ValueRow } from "@/app/settings/gsk-sheet";
import { saveAccountContact, type SaveContactResult } from "./actions";

export type AccountContactValues = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

/** The client's contact details: values in the page, changes in a sheet (docs/HANDOFF.md §C). */
export function AccountContact({ account, canEdit }: { account: AccountContactValues; canEdit: boolean }) {
  const t = useTranslations("clientAccount.contact");
  const [editing, setEditing] = useState(false);
  const empty = <span className="gsk-value--muted">{t("empty")}</span>;

  return (
    <section className="gsk-block rounded-2xl border border-border bg-card px-5 py-4">
      <div className="gsk-block-head gsk-block-head--action">
        <div>
          <h2 className="gsk-block-title">{t("title")}</h2>
          <p className="gsk-block-description">{t("description")}</p>
        </div>
        {canEdit ? (
          <button type="button" className="gsk-btn" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            {t("edit")}
          </button>
        ) : null}
      </div>
      <ValueRow label={t("contactName")}>{account.contactName || empty}</ValueRow>
      <ValueRow label={t("email")}>
        {account.email ? (
          <a href={`mailto:${account.email}`} className="gsk-link">
            {account.email}
          </a>
        ) : (
          empty
        )}
      </ValueRow>
      <ValueRow label={t("phone")}>
        {account.phone ? (
          <a href={`tel:${account.phone.replace(/\s+/g, "")}`} className="gsk-link">
            {account.phone}
          </a>
        ) : (
          empty
        )}
      </ValueRow>
      <ValueRow label={t("address")}>
        {account.address ? <span className="whitespace-pre-line text-right">{account.address}</span> : empty}
      </ValueRow>
      {account.notes ? (
        <ValueRow label={t("notes")}>
          <span className="whitespace-pre-line text-right">{account.notes}</span>
        </ValueRow>
      ) : null}

      {editing ? <ContactSheet account={account} onClose={() => setEditing(false)} /> : null}
    </section>
  );
}

function ContactSheet({ account, onClose }: { account: AccountContactValues; onClose: () => void }) {
  const t = useTranslations("clientAccount.contact");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SaveContactResult | null, FormData>(saveAccountContact, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  const error = state && !state.ok ? state.field : null;
  const fieldError = (f: "name" | "email") =>
    error === f ? <span className="gsk-status-error">{t(`error_${f}`)}</span> : undefined;

  return (
    <GskSheet
      title={t("sheetTitle")}
      subtitle={account.name}
      icon={<Building2 className="size-4" />}
      closeLabel={t("cancel")}
      onClose={onClose}
    >
      {/* Submitted by hand rather than with action={…}: React 19 resets a
          form after its action runs, so a rejected email would also have
          wiped every other field the user had just typed. */}
      <form
        className="gsk-sheet-form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        <input type="hidden" name="accountId" value={account.id} />
        <div className="gsk-drawer__body">
          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("companyTitle")}</h4>
            <SheetField label={t("name")} htmlFor="ac-name" help={fieldError("name") ?? t("nameHelp")}>
              <input id="ac-name" name="name" required maxLength={120} defaultValue={account.name} className="gsk-input" />
            </SheetField>
          </div>
          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("personTitle")}</h4>
            <SheetField label={t("contactName")} htmlFor="ac-contact">
              <input
                id="ac-contact"
                name="contactName"
                maxLength={500}
                defaultValue={account.contactName ?? ""}
                placeholder={t("contactNamePlaceholder")}
                className="gsk-input"
              />
            </SheetField>
            <div className="gsk-sheet-grid">
              <SheetField label={t("email")} htmlFor="ac-email" help={fieldError("email")}>
                <input
                  id="ac-email"
                  name="email"
                  type="email"
                  maxLength={200}
                  defaultValue={account.email ?? ""}
                  placeholder="contact@entreprise.fr"
                  className="gsk-input"
                />
              </SheetField>
              <SheetField label={t("phone")} htmlFor="ac-phone">
                <input
                  id="ac-phone"
                  name="phone"
                  type="tel"
                  maxLength={500}
                  defaultValue={account.phone ?? ""}
                  placeholder="01 23 45 67 89"
                  className="gsk-input"
                />
              </SheetField>
            </div>
            <SheetField label={t("address")} htmlFor="ac-address" help={t("addressHelp")}>
              <textarea
                id="ac-address"
                name="address"
                rows={3}
                maxLength={500}
                defaultValue={account.address ?? ""}
                className="gsk-textarea"
              />
            </SheetField>
          </div>
          <div className="gsk-sheet-section">
            <h4 className="gsk-section-title">{t("notes")}</h4>
            <SheetField label={t("notes")} htmlFor="ac-notes" help={t("notesHelp")}>
              <textarea
                id="ac-notes"
                name="notes"
                rows={4}
                maxLength={4000}
                defaultValue={account.notes ?? ""}
                className="gsk-textarea"
              />
            </SheetField>
            {error === "access" || error === "other" ? (
              <p className="gsk-help gsk-status-error m-0 inline-flex items-center gap-1.5">
                <AlertCircle className="size-4" />
                {t(`error_${error}`)}
              </p>
            ) : null}
          </div>
        </div>
        <footer className="gsk-drawer__footer">
          <div />
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
