"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, KeyRound, Pencil, Trash2, Upload } from "lucide-react";
import { UserAvatar } from "@/components/shell/user-avatar";
import { GskSheet, SheetField, ValueRow } from "../gsk-sheet";
import { changePassword, updateAvatar, updateProfileName } from "./actions";
import { AVATAR_MAX_UPLOAD_BYTES, AVATAR_SIZE } from "./avatar";

/*
 * The window shows the values; changing the name or the password happens
 * in a sheet from the right, like every other settings section. The photo
 * is changed in place: pick a file, it is cropped to a centred square and
 * shrunk to 256 px in the browser, then saved.
 */

export function ProfileForm({
  name,
  email,
  avatar,
}: {
  name: string | null;
  email: string;
  avatar: string | null;
}) {
  const t = useTranslations("settingsProfile");
  const router = useRouter();
  const [sheet, setSheet] = useState<"name" | "password" | null>(null);
  const [photo, setPhoto] = useState(avatar);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const savePhoto = (next: string | null) =>
    start(async () => {
      setPhotoError(null);
      setNotice(null);
      const res = await updateAvatar(next);
      if (!res.ok) return setPhotoError(res.error);
      setPhoto(next);
      setNotice(next ? t("photoSaved") : t("photoRemoved"));
      router.refresh();
      // The account menu reads /api/auth/status once per page load.
      window.dispatchEvent(new Event("profile-updated"));
    });

  const onFile = async (file: File) => {
    setPhotoError(null);
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type) || file.size > AVATAR_MAX_UPLOAD_BYTES) {
      return setPhotoError(t("photoBadFile"));
    }
    try {
      savePhoto(await squareWebp(file, AVATAR_SIZE));
    } catch {
      setPhotoError(t("photoBadFile"));
    }
  };

  return (
    <>
      <section className="gsk-block">
        <div className="gsk-block-head gsk-block-head--action">
          <div>
            <h2 className="gsk-block-title">{t("identityTitle")}</h2>
            <p className="gsk-block-description">{t("identityHint")}</p>
          </div>
        </div>

        <ValueRow label={t("photoLabel")} hint={t("photoHint")}>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <UserAvatar src={photo} name={name || email} className="size-12 text-base" />
            <button
              type="button"
              className="gsk-btn"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" />
              {photo ? t("photoReplace") : t("photoUpload")}
            </button>
            {photo ? (
              <button
                type="button"
                className="gsk-btn gsk-btn--danger-text"
                disabled={pending}
                onClick={() => savePhoto(null)}
              >
                <Trash2 className="size-4" />
                {t("photoRemove")}
              </button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </ValueRow>
        {photoError ? (
          <p className="gsk-help gsk-status-error mt-1 inline-flex items-center gap-1.5">
            <AlertCircle className="size-3.5" />
            {photoError}
          </p>
        ) : notice ? (
          <p className="gsk-help gsk-status-ok mt-1 inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" />
            {notice}
          </p>
        ) : null}

        <ValueRow label={t("nameLabel")} hint={t("nameHint")}>
          <span className="inline-flex items-center gap-2">
            {name || <span className="gsk-value--muted">{t("notSet")}</span>}
            <button
              type="button"
              className="gsk-btn gsk-btn--text gsk-btn--sm"
              aria-label={t("editName")}
              title={t("editName")}
              onClick={() => setSheet("name")}
            >
              <Pencil className="size-4" />
            </button>
          </span>
        </ValueRow>

        <ValueRow label={t("passwordLabel")} hint={t("passwordHint")}>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="tracking-widest">••••••••</span>
            <button
              type="button"
              className="gsk-btn gsk-btn--text gsk-btn--sm"
              aria-label={t("changePassword")}
              title={t("changePassword")}
              onClick={() => setSheet("password")}
            >
              <Pencil className="size-4" />
            </button>
          </span>
        </ValueRow>
      </section>

      {sheet === "name" ? (
        <NameSheet
          initial={name ?? ""}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            setNotice(t("nameSaved"));
            router.refresh();
            window.dispatchEvent(new Event("profile-updated"));
          }}
        />
      ) : null}
      {sheet === "password" ? (
        <PasswordSheet
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            setNotice(t("passwordSaved"));
          }}
        />
      ) : null}
    </>
  );
}

function NameSheet({
  initial,
  onClose,
  onSaved,
}: {
  initial: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("settingsProfile");
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <GskSheet
      title={t("nameSheetTitle")}
      subtitle={t("nameHint")}
      icon={<Pencil className="size-4" />}
      closeLabel={t("cancel")}
      onClose={onClose}
    >
      <form
        className="gsk-sheet-form"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await updateProfileName(value);
            if (res.ok) onSaved();
            else setError(res.error);
          });
        }}
      >
        <div className="gsk-drawer__body">
          <div className="gsk-sheet-section">
            <SheetField label={t("nameLabel")} htmlFor="profile-name">
              <input
                id="profile-name"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={80}
                autoComplete="name"
                autoFocus
                className="gsk-input"
              />
            </SheetField>
          </div>
        </div>
        <SheetFooter error={error} pending={pending} onClose={onClose} />
      </form>
    </GskSheet>
  );
}

function PasswordSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("settingsProfile");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <GskSheet
      title={t("changePassword")}
      subtitle={t("passwordSheetHint")}
      icon={<KeyRound className="size-4" />}
      closeLabel={t("cancel")}
      onClose={onClose}
    >
      <form
        className="gsk-sheet-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          // Checked here for a quick answer; the server checks again.
          if (next !== confirm) return setError(t("errors.mismatch"));
          start(async () => {
            const res = await changePassword({ current, next, confirm });
            if (res.ok) onSaved();
            else setError(res.error);
          });
        }}
      >
        <div className="gsk-drawer__body">
          <div className="gsk-sheet-section">
            <SheetField label={t("currentPassword")} htmlFor="pw-current">
              <input
                id="pw-current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
                className="gsk-input"
              />
            </SheetField>
            <SheetField label={t("newPassword")} htmlFor="pw-new" help={t("newPasswordHint")}>
              <input
                id="pw-new"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                minLength={10}
                maxLength={200}
                required
                className="gsk-input"
              />
            </SheetField>
            <SheetField label={t("confirmPassword")} htmlFor="pw-confirm">
              <input
                id="pw-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                className="gsk-input"
              />
            </SheetField>
          </div>
        </div>
        <SheetFooter error={error} pending={pending} onClose={onClose} />
      </form>
    </GskSheet>
  );
}

function SheetFooter({
  error,
  pending,
  onClose,
}: {
  error: string | null;
  pending: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("settingsProfile");
  return (
    <footer className="gsk-drawer__footer">
      <p className="m-0 min-w-0 text-[13px]">
        {error ? (
          <span className="gsk-status-error inline-flex items-center gap-1.5">
            <AlertCircle className="size-3.5" />
            {error}
          </span>
        ) : null}
      </p>
      <div className="gsk-drawer__footer-right">
        <button type="button" className="gsk-btn" onClick={onClose}>
          {t("cancel")}
        </button>
        <button type="submit" className="gsk-btn gsk-btn--primary" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </footer>
  );
}

/**
 * Crop the centre square of an image and draw it at `size` px as WebP
 * (JPEG where the browser cannot encode WebP). Runs in the browser, so
 * a 6 MB phone photo becomes ~20 KB before it is sent.
 */
async function squareWebp(file: File, size: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}
