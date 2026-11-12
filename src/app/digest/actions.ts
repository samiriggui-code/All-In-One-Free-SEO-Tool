"use server";

import { actionTx } from "@/lib/action-tx";
import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import { buildWeeklyDigest } from "@/lib/weekly-digest";
import { sendMail } from "@/lib/mailer";
import { setSetting, getSetting } from "@/lib/settings-store";

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(2).max(120).default("Weekly SEO digest"),
});

export type SendState =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

export async function sendDigest(
  _prev: SendState | null,
  formData: FormData,
): Promise<SendState> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_digest_actions");
  const parsed = sendSchema.safeParse({
    to: formData.get("to"),
    subject: formData.get("subject") || tx("weeklySeoDigest"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? tx("invalidEmailAddress"),
    };
  }

  const digest = await buildWeeklyDigest();

  const result = await sendMail({
    to: [parsed.data.to],
    subject: parsed.data.subject,
    text: digest.textVersion,
    html: digest.htmlVersion,
  });
  if (!result.ok) return { ok: false, error: result.error ?? tx("sendFailed") };

  // Save the email so we can use it as the default for the auto-schedule
  await setSetting("digest.recipient_email", parsed.data.to);
  await setSetting("digest.last_sent_at", new Date().toISOString());

  return { ok: true, messageId: result.messageId ?? null };
}

export type ScheduleState =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function setSchedule(
  _prev: ScheduleState | null,
  formData: FormData,
): Promise<ScheduleState> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_digest_actions");
  const enabled = formData.get("enabled") === "on";
  const email = String(formData.get("email") ?? "").trim();
  if (enabled) {
    const r = z.string().email().safeParse(email);
    if (!r.success)
      return { ok: false, error: tx("validRecipientEmailRequiredTo") };
    await setSetting("digest.recipient_email", email);
    await setSetting("digest.auto_send_enabled", true);
    return {
      ok: true,
      message: `Auto-send enabled. Will run every Monday 09:00 UTC to ${email}.`,
    };
  }
  await setSetting("digest.auto_send_enabled", false);
  return { ok: true, message: tx("autoSendDisabled") };
}

export async function loadDigestSettings() {
  await requireSignedIn();
  return {
    recipientEmail:
      (await getSetting<string>("digest.recipient_email")) ?? "",
    autoSendEnabled: Boolean(
      await getSetting<boolean>("digest.auto_send_enabled"),
    ),
    lastSentAt: (await getSetting<string>("digest.last_sent_at")) ?? null,
  };
}
