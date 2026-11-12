"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { actionTx } from "@/lib/action-tx";
import { requireSignedIn } from "@/lib/action-guard";
import { logActivity } from "@/lib/activity";
import {
  MIN_PASSWORD_LENGTH,
  currentUser,
  hashPassword,
  issueSession,
  requireEditor,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidAvatar } from "./avatar";

/**
 * My profile: what each person changes about their own account. Nothing
 * here touches anyone else's row, so the only role check is that the
 * caller may change things at all (`requireEditor`); the row changed is
 * always the caller's own, read from the session, never from the form.
 */

export type ProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfileName(name: string): Promise<ProfileResult> {
  await requireEditor();
  await requireSignedIn();
  const tx = await actionTx("settingsProfile");
  const me = await currentUser();
  if (!me) return { ok: false, error: tx("errors.noAccount") };

  const clean = String(name ?? "").trim().replace(/\s+/g, " ");
  if (clean.length > 80) return { ok: false, error: tx("errors.nameTooLong") };

  db.update(users)
    .set({ name: clean || null })
    .where(eq(users.id, me.id))
    .run();
  revalidatePath("/settings/profile");
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function updateAvatar(dataUrl: string | null): Promise<ProfileResult> {
  await requireEditor();
  await requireSignedIn();
  const tx = await actionTx("settingsProfile");
  const me = await currentUser();
  if (!me) return { ok: false, error: tx("errors.noAccount") };

  if (dataUrl !== null && !isValidAvatar(String(dataUrl))) {
    return { ok: false, error: tx("errors.badAvatar") };
  }

  db.update(users)
    .set({ avatar: dataUrl })
    .where(eq(users.id, me.id))
    .run();
  revalidatePath("/settings/profile");
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function changePassword(input: {
  current: string;
  next: string;
  confirm: string;
}): Promise<ProfileResult> {
  await requireEditor();
  await requireSignedIn();
  const tx = await actionTx("settingsProfile");
  const me = await currentUser();
  if (!me) return { ok: false, error: tx("errors.noAccount") };

  // Five tries a quarter of an hour: enough for typos, not for guessing
  // the current password of a session left open on someone's desk.
  const limit = checkRateLimit(`change-password:${me.id}`, {
    max: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) return { ok: false, error: tx("errors.tooManyTries") };

  const current = String(input?.current ?? "");
  const next = String(input?.next ?? "");
  const confirm = String(input?.confirm ?? "");

  if (!(await verifyPassword(current, me.passwordHash))) {
    return { ok: false, error: tx("errors.wrongCurrent") };
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: tx("errors.tooShort", { min: MIN_PASSWORD_LENGTH }) };
  }
  if (next.length > 200) return { ok: false, error: tx("errors.tooLong") };
  if (next !== confirm) return { ok: false, error: tx("errors.mismatch") };
  if (next === current) return { ok: false, error: tx("errors.sameAsCurrent") };

  const passwordHash = await hashPassword(next);
  db.update(users).set({ passwordHash }).where(eq(users.id, me.id)).run();

  // Every session carries a fingerprint of the password hash, so all of
  // them, this one included, stop working now. Sign this browser back in;
  // the others (a lost laptop, a shared computer) stay signed out.
  await issueSession({ ...me, passwordHash });

  await logActivity({
    kind: "account.password_changed",
    message: tx("journal.passwordChanged", { name: me.name || me.email }),
    entityType: "user",
    entityId: me.id,
    dedupe: false,
  });
  return { ok: true };
}
