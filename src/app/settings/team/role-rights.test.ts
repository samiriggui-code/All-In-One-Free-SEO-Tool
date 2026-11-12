import { describe, expect, it } from "vitest";
import { routeDecision } from "@/lib/permissions";
import { canEdit, canManageSettings, canManageTeam, seesAllClients } from "@/lib/auth";
import { ROLE_RIGHTS } from "./role-rights";

/** The table on Settings → Team must say what the server actually does. */
const ROLES = ["owner", "manager", "member", "viewer"] as const;
const row = (key: string) => ROLE_RIGHTS.find((r) => r.key === key)!.cells;

describe("ROLE_RIGHTS", () => {
  it("matches who sees every client", () => {
    for (const r of ROLES) {
      expect(row("clients")[r] === "yes").toBe(seesAllClients(r));
    }
  });

  it("matches who may change things", () => {
    for (const r of ROLES) {
      expect(row("work")[r] !== "no").toBe(canEdit(r));
    }
  });

  it("matches the owner-only settings and team pages", () => {
    for (const r of ROLES) {
      expect(row("settings")[r] === "yes").toBe(canManageSettings(r));
      expect(row("team")[r] === "yes").toBe(canManageTeam(r));
      expect(row("settings")[r] === "yes").toBe(routeDecision(r, "/settings/api", "GET") === "allow");
    }
  });

  it("matches who opens My profile and the tools", () => {
    for (const r of ROLES) {
      expect(row("profile")[r] === "yes").toBe(routeDecision(r, "/settings/profile", "GET") === "allow");
      expect(row("tools")[r] === "yes").toBe(routeDecision(r, "/tools/robots", "GET") === "allow");
    }
  });
});
