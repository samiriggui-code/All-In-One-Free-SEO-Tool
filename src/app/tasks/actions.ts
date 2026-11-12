"use server";

import { actionTx } from "@/lib/action-tx";
import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { clients, tasks } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { currentUserId, requireClientAccess, requireEditor } from "@/lib/auth";
import { mayAccessClient } from "@/lib/client-scope";
import { allPagesDone, type TaskPage } from "@/lib/task-pages";

/**
 * The task ids, of those given, that the caller may change: an editor
 * (not a read-only member) and assigned to the task's project.
 *
 * Every action here used to take any task id from any signed-in user, so
 * a read-only member, or one limited to other clients, could finish,
 * reschedule or delete another client's work by sending its number.
 * Unknown and out-of-scope ids are dropped alike.
 */
async function editableTaskIds(ids: number[]): Promise<number[]> {
  await requireEditor();
  const valid = ids.filter((id) => Number.isFinite(id) && id > 0);
  if (valid.length === 0) return [];
  const rows = await db
    .select({ id: tasks.id, clientId: tasks.clientId })
    .from(tasks)
    .where(inArray(tasks.id, valid));
  const allowed: number[] = [];
  for (const r of rows) if (await mayAccessClient(r.clientId)) allowed.push(r.id);
  return allowed;
}

type Recur = "daily" | "weekly" | "monthly" | "quarterly";

function nextDueDate(prev: Date | null, interval: Recur): Date {
  const base = prev ?? new Date();
  const next = new Date(base.getTime());
  if (interval === "daily") next.setDate(next.getDate() + 1);
  else if (interval === "weekly") next.setDate(next.getDate() + 7);
  else if (interval === "monthly") next.setMonth(next.getMonth() + 1);
  else if (interval === "quarterly") next.setMonth(next.getMonth() + 3);
  return next;
}

export async function setTaskStatus(
  taskId: number,
  status: "todo" | "in_progress" | "done" | "skipped",
) {
  await requireSignedIn();
  const tx = await actionTx("ui.app_tasks_actions");
  if ((await editableTaskIds([taskId])).length === 0) return;

  const [existing] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!existing) return;

  // Record who finished it. Cleared when a task is reopened, so the
  // column always means "who completed the state it's in now" rather
  // than "who touched it once" — /capacity and the monthly report both
  // read it as the former.
  const completedByUserId =
    status === "done" ? await currentUserId() : null;

  await db
    .update(tasks)
    .set({ status, completedByUserId, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  if (status === "done" && existing.status !== "done") {
    await logActivity({
      kind: "task.completed",
      message: tx("completedTask", { title: existing.title }),
      level: "success",
      clientId: existing.clientId,
      entityType: "task",
      entityId: existing.id,
    });
  }

  // If a recurring task was just marked done, clone the next instance.
  if (
    status === "done" &&
    existing.recurringInterval &&
    existing.status !== "done"
  ) {
    const nextDue = nextDueDate(
      existing.dueDate,
      existing.recurringInterval as Recur,
    );
    await db.insert(tasks).values({
      clientId: existing.clientId,
      title: existing.title,
      description: existing.description,
      whyItMatters: existing.whyItMatters,
      priority: existing.priority,
      status: "todo",
      dueDate: nextDue,
      recurringInterval: existing.recurringInterval,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(taskId: number) {
  await requireSignedIn();
  if ((await editableTaskIds([taskId])).length === 0) return;
  await db.delete(tasks).where(eq(tasks.id, taskId));
  revalidatePath("/tasks");
  revalidatePath("/");
}

const newTaskSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  title: z.string().trim().min(2).max(200),
  whyItMatters: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  dueInDays: z.coerce.number().int().min(0).max(365).optional(),
  recurringInterval: z
    .enum(["daily", "weekly", "monthly", "quarterly"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateTaskResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function createTask(
  _prev: CreateTaskResult | null,
  formData: FormData,
): Promise<CreateTaskResult> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_tasks_actions");
  const raw = {
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    whyItMatters: formData.get("whyItMatters") ?? undefined,
    priority: formData.get("priority") ?? "medium",
    dueInDays: formData.get("dueInDays") ?? undefined,
    recurringInterval:
      formData.get("recurringInterval") === ""
        ? undefined
        : (formData.get("recurringInterval") ?? undefined),
  };
  const parsed = newTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? tx("invalidInput"),
    };
  }

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, parsed.data.clientId))
    .limit(1);
  if (!client) return { ok: false, error: tx("clientNotFound") };
  await requireClientAccess(client.id, { edit: true });

  const dueDate =
    typeof parsed.data.dueInDays === "number"
      ? new Date(Date.now() + parsed.data.dueInDays * 86_400_000)
      : null;

  const [row] = await db
    .insert(tasks)
    .values({
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      whyItMatters: parsed.data.whyItMatters,
      priority: parsed.data.priority,
      status: "todo",
      dueDate,
      recurringInterval: parsed.data.recurringInterval,
    })
    .returning({ id: tasks.id });

  await logActivity({
    kind: "task.created",
    message: tx("newTask", { title: parsed.data.title }),
    clientId: parsed.data.clientId,
    entityType: "task",
    entityId: row.id,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, id: row.id };
}

export async function setTaskRecurrence(
  taskId: number,
  recurringInterval:
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | null,
) {
  await requireSignedIn();
  if ((await editableTaskIds([taskId])).length === 0) return;
  await db
    .update(tasks)
    .set({ recurringInterval, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));
  revalidatePath("/tasks");
}

export async function logTaskTime(input: {
  taskId: number;
  /** Minutes to add. Negative subtracts. */
  minutes: number;
}): Promise<{ ok: true; total: number } | { ok: false; error: string }> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_tasks_actions");
  if ((await editableTaskIds([input.taskId])).length === 0) {
    return { ok: false, error: tx("taskNotFound") };
  }
  if (!Number.isFinite(input.minutes) || input.minutes === 0) {
    return { ok: false, error: tx("enterMinutes") };
  }
  const [t] = await db
    .select({ id: tasks.id, actualMinutes: tasks.actualMinutes })
    .from(tasks)
    .where(eq(tasks.id, input.taskId))
    .limit(1);
  if (!t) return { ok: false, error: tx("taskNotFound") };
  const newTotal = Math.max(0, (t.actualMinutes ?? 0) + Math.round(input.minutes));
  await db
    .update(tasks)
    .set({ actualMinutes: newTotal, updatedAt: new Date() })
    .where(eq(tasks.id, input.taskId));
  revalidatePath("/tasks");
  revalidatePath("/capacity");
  return { ok: true, total: newTotal };
}

export async function setTaskEstimate(
  taskId: number,
  estimatedMinutes: number | null,
): Promise<void> {
  await requireSignedIn();
  if ((await editableTaskIds([taskId])).length === 0) return;
  const v =
    estimatedMinutes === null || !Number.isFinite(estimatedMinutes)
      ? null
      : Math.max(0, Math.round(estimatedMinutes));
  await db
    .update(tasks)
    .set({ estimatedMinutes: v, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));
  revalidatePath("/tasks");
  revalidatePath("/capacity");
}

// Bulk operations: every id goes through editableTaskIds.

export async function bulkSetTaskStatus(
  ids: number[],
  status: "todo" | "in_progress" | "done" | "skipped",
) {
  await requireSignedIn();
  const valid = await editableTaskIds(ids);
  if (valid.length === 0) return;
  await db
    .update(tasks)
    .set({
      status,
      completedByUserId: status === "done" ? await currentUserId() : null,
      updatedAt: new Date(),
    })
    .where(inArray(tasks.id, valid));
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function bulkSetTaskPriority(
  ids: number[],
  priority: "high" | "medium" | "low",
) {
  await requireSignedIn();
  const valid = await editableTaskIds(ids);
  if (valid.length === 0) return;
  await db
    .update(tasks)
    .set({ priority, updatedAt: new Date() })
    .where(inArray(tasks.id, valid));
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function bulkDeleteTasks(ids: number[]) {
  await requireSignedIn();
  const valid = await editableTaskIds(ids);
  if (valid.length === 0) return;
  await db.delete(tasks).where(inArray(tasks.id, valid));
  revalidatePath("/tasks");
  revalidatePath("/");
}

import { getPlaybook } from "@/lib/niche-templates";
import { getReportLocale } from "@/lib/report-i18n";
import { localizeTemplate } from "@/lib/template-i18n";

export async function applyPlaybookToClient(input: {
  playbookId: string;
  clientId: number;
}): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_tasks_actions");
  if (!Number.isFinite(input.clientId) || input.clientId <= 0) {
    return { ok: false, error: tx("invalidClient") };
  }
  const pb = getPlaybook(input.playbookId);
  if (!pb) return { ok: false, error: tx("unknownPlaybook") };

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .limit(1);
  if (!client) return { ok: false, error: tx("clientNotFound2") };
  await requireClientAccess(client.id, { edit: true });

  const now = Date.now();
  const locale = await getReportLocale();
  const rows = pb.tasks.map((raw) => localizeTemplate(raw, locale)).map((t) => ({
    clientId: input.clientId,
    title: t.title,
    description: t.description,
    whyItMatters: t.whyItMatters,
    priority: t.priority,
    status: "todo" as const,
    dueDate:
      typeof t.offsetDays === "number"
        ? new Date(now + t.offsetDays * 86_400_000)
        : null,
  }));

  await db.insert(tasks).values(rows);
  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, created: rows.length };
}

/**
 * Tick or untick one page of a task (tasks.pages_json, lib/task-pages.ts).
 * When the last page is ticked the task is done; unticking one reopens a
 * finished task, since its job is no longer complete.
 */
export async function setTaskPageDone(
  taskId: number,
  url: string,
  done: boolean,
): Promise<{ ok: true; pages: TaskPage[]; status: string } | { ok: false; error: string }> {
  await requireSignedIn();
  const tx = await actionTx("ui.app_tasks_actions");
  if ((await editableTaskIds([taskId])).length === 0) return { ok: false, error: tx("taskNotFound") };
  const [task] = await db
    .select({ pages: tasks.pages, status: tasks.status, title: tasks.title, clientId: tasks.clientId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task?.pages?.some((p) => p.url === url)) return { ok: false, error: tx("pageNotFound") };

  const pages = task.pages.map((p) => (p.url === url ? { ...p, done } : p));
  const finished = allPagesDone(pages);
  const status =
    finished && task.status !== "done" ? "done" : !finished && task.status === "done" ? "in_progress" : task.status;
  await db
    .update(tasks)
    .set({
      pages,
      status,
      ...(status !== task.status ? { completedByUserId: status === "done" ? await currentUserId() : null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));
  if (status === "done" && task.status !== "done") {
    await logActivity({
      kind: "task.completed",
      message: tx("completedTask2", { title: task.title }),
      level: "success",
      clientId: task.clientId,
      entityType: "task",
      entityId: taskId,
    });
  }
  revalidatePath("/tasks");
  return { ok: true, pages, status };
}
