/** Mission types and states. No imports: safe in client components. */
export const MISSION_KINDS = ["audit", "monitoring", "full", "redesign", "other"] as const;
export type MissionKind = (typeof MISSION_KINDS)[number];
export const MISSION_STATUSES = ["proposed", "active", "paused", "done", "cancelled"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];
