"use server";

import { actionTx } from "@/lib/action-tx";
import type { Tx } from "@/lib/tx";
import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { clientMembers, userInvites, users, type Role } from "@/db/schema";
import { canManageTeam, currentUser, seesAllClients } from "@/lib/auth";
import { createInvite, revokeInvite } from "@/lib/invites";
import { logActivity, type ActivityKind } from "@/lib/activity";

/**
 * One line in the access journal (Settings → Team). Written in the
 * workspace owner's language at the time, like the rest of the activity
 * log; `entityId` is the person concerned.
 */
async function journal(
  kind: ActivityKind,
  key: string,
  values: Record<string, string | number>,
  userId?: number,
): Promise<void> {
  const jt = await actionTx("settingsTeam.journal");
  await logActivity({
    kind,
    message: jt(key, values),
    entityType: userId ? "user" : "invite",
    entityId: userId,
    dedupe: false,
  });
}

/** Name of a person for the journal: their name, else their e-mail. */
function who(userId: number): string {
  const u = db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return u ? u.name || u.email : `#${userId}`;
}

/**
 * Every action here re-checks the caller's role server-side. The UI
 * already hides these controls from non-owners, but hiding a button is
 * a courtesy, not a permission — a server action is a public endpoint
 * with a nicer calling convention.
 */
async function requireOwner(tx: Tx): Promise<{ id: number } | { error: string }> {
  const me = await currentUser();
  if (!me) return { error: tx("youNeedToBeSigned") };
  if (!canManageTeam(me.role)) {
    return { error: tx("onlyTheOwnerCanManage") };
  }
  return { id: me.id };
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function inviteMember(input: {
  email: string;
  role: Role;
}): Promise<ActionResult & { link?: string }> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_settings_team_actions");
  const me = await requireOwner(tx);
  if ("error" in me) return { ok: false, error: me.error };

  const created = await createInvite({
    email: input.email,
    role: input.role,
    invitedBy: me.id,
  });
  if (!created.ok) return { ok: false, error: created.error };

  await journal("team.invited", "invited", { email: input.email, role: input.role });
  revalidatePath("/settings/team");
  // The link is returned rather than emailed. Requiring SMTP to add a
  // second person to a self-hosted tool would put the feature behind
  // mail-server setup; copying a link into Slack takes five seconds.
  return { ok: true, link: `/invite/${created.result.token}` };
}

export async function cancelInvite(id: number): Promise<ActionResult> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_settings_team_actions");
  const me = await requireOwner(tx);
  if ("error" in me) return { ok: false, error: me.error };
  const invite = db
    .select({ email: userInvites.email })
    .from(userInvites)
    .where(eq(userInvites.id, id))
    .get();
  revokeInvite(id);
  if (invite) await journal("team.invite_cancelled", "inviteCancelled", { email: invite.email });
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function changeRole(
  userId: number,
  role: Role,
): Promise<ActionResult> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_settings_team_actions");
  const me = await requireOwner(tx);
  if ("error" in me) return { ok: false, error: me.error };

  // Don't let the last owner demote themselves into an instance nobody
  // can administer. There is no support desk to undo that.
  if (userId === me.id && role !== "owner") {
    const owners = db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, "owner"), eq(users.active, true)))
      .get();
    if ((owners?.n ?? 0) <= 1) {
      return {
        ok: false,
        error:
          tx("youReTheOnlyOwner"),
      };
    }
  }

  const before = db.select({ role: users.role }).from(users).where(eq(users.id, userId)).get();
  db.update(users).set({ role }).where(eq(users.id, userId)).run();
  if (before && before.role !== role) {
    await journal(
      "team.role_changed",
      "roleChanged",
      { name: who(userId), from: before.role, to: role },
      userId,
    );
  }
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function setActive(
  userId: number,
  active: boolean,
): Promise<ActionResult> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_settings_team_actions");
  const me = await requireOwner(tx);
  if ("error" in me) return { ok: false, error: me.error };

  if (userId === me.id && !active) {
    return { ok: false, error: tx("youCanTDeactivateYour") };
  }
  if (!active) {
    const owners = db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, "owner"), eq(users.active, true)))
      .get();
    const target = db.select().from(users).where(eq(users.id, userId)).get();
    if (target?.role === "owner" && (owners?.n ?? 0) <= 1) {
      return { ok: false, error: tx("thatSTheOnlyActive") };
    }
  }

  // Deactivate, never delete: their name stays on the tasks they
  // completed and the reports that cite them. Deleting the row would
  // null out that history via ON DELETE SET NULL, which is a strange
  // way to remove someone from a team.
  db.update(users).set({ active }).where(eq(users.id, userId)).run();
  await journal(
    active ? "team.reactivated" : "team.deactivated",
    active ? "reactivated" : "deactivated",
    { name: who(userId) },
    userId,
  );
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function setClientAccess(
  userId: number,
  clientIds: number[],
): Promise<ActionResult> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_settings_team_actions");
  const me = await requireOwner(tx);
  if ("error" in me) return { ok: false, error: me.error };

  const target = db.select().from(users).where(eq(users.id, userId)).get();
  if (!target) return { ok: false, error: tx("noSuchUser") };
  if (seesAllClients(target.role)) {
    return {
      ok: false,
      error: `${target.role === "owner" ? "Owners" : "Managers"} already see every client — assignments don't apply to them.`,
    };
  }

  db.delete(clientMembers).where(eq(clientMembers.userId, userId)).run();
  for (const clientId of clientIds) {
    db.insert(clientMembers).values({ userId, clientId }).run();
  }
  await journal(
    "team.access_changed",
    "accessChanged",
    { name: target.name || target.email, count: clientIds.length },
    userId,
  );
  revalidatePath("/settings/team");
  return { ok: true, message: tx("clientSAssigned", { length: clientIds.length }) };
}
