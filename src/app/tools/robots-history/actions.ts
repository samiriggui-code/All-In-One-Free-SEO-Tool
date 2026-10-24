"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import { snapshotRobots, listSnapshots } from "@/lib/robots-snapshots";

export type SnapshotState =
  | { ok: true; changed: boolean }
  | { ok: false; error: string };

export async function runSnapshot(
  _prev: SnapshotState | null,
  formData: FormData,
): Promise<SnapshotState> {
  await requireSignedIn();
  const host = String(formData.get("host") ?? "").trim();
  if (!host) return { ok: false, error: "Enter a domain." };
  const r = await snapshotRobots(host);
  revalidatePath("/tools/robots-history");
  if (!r.ok) return { ok: false, error: r.error ?? "Snapshot failed" };
  return { ok: true, changed: r.changed };
}

export async function loadSnapshots(host: string) {
  await requireSignedIn();
  return listSnapshots(host);
}
