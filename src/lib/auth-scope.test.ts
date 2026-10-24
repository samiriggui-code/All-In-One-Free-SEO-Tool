import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import {
  accountsEnabled,
  canSeeClient,
  effectiveRole,
  mayEdit,
  mayManageSettings,
  visibleClientIds,
} from "./auth";

/**
 * What a request with no valid user may do.
 *
 * `currentUser()` answers null both on a solo install and when a session
 * has been revoked (user deleted, deactivated, password changed). The two
 * must not be treated the same: the second used to inherit solo-install
 * access, rendering as "Local user" with every client visible.
 *
 * One file, run in order, because turning accounts on is one-way.
 */
describe("null user", () => {
  it("is the owner of a solo install", async () => {
    expect(accountsEnabled()).toBe(false);
    expect(effectiveRole(null)).toBe("owner");
    expect(mayEdit(null)).toBe(true);
    expect(mayManageSettings(null)).toBe(true);
    expect(await visibleClientIds(null)).toBeNull();
    expect(await canSeeClient(null, 1)).toBe(true);
  });

  it("sees and does nothing once accounts exist", async () => {
    db.insert(users)
      .values({
        email: "owner@example.test",
        passwordHash: "scrypt:1:00:00",
        role: "owner",
        active: true,
      })
      .run();

    expect(accountsEnabled()).toBe(true);
    expect(effectiveRole(null)).toBeNull();
    expect(mayEdit(null)).toBe(false);
    expect(mayManageSettings(null)).toBe(false);
    expect(await visibleClientIds(null)).toEqual([]);
    expect(await canSeeClient(null, 1)).toBe(false);
  });
});
