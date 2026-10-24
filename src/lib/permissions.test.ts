import { describe, expect, it } from "vitest";
import { routeDecision } from "./permissions";

describe("routeDecision", () => {
  it("lets the owner do anything", () => {
    expect(routeDecision("owner", "/settings/team", "POST")).toBe("allow");
    expect(routeDecision("owner", "/api/backup", "GET")).toBe("allow");
  });

  it("keeps managers and members out of workspace administration", () => {
    for (const role of ["manager", "member"] as const) {
      expect(routeDecision(role, "/settings/team", "GET")).toBe("deny");
      expect(routeDecision(role, "/settings/api-keys", "POST")).toBe("deny");
      expect(routeDecision(role, "/api/restore", "POST")).toBe("deny");
      expect(routeDecision(role, "/api/team/invite", "POST")).toBe("deny");
      // The settings landing page explains the role instead.
      expect(routeDecision(role, "/settings", "GET")).toBe("allow");
      // The work itself is theirs.
      expect(routeDecision(role, "/tools/robots", "GET")).toBe("allow");
      expect(routeDecision(role, "/clients/3", "POST")).toBe("allow");
    }
  });

  it("does not mistake a lookalike path for an admin one", () => {
    expect(routeDecision("member", "/api/teamwork", "GET")).toBe("allow");
  });

  it("makes a client viewer read-only", () => {
    expect(routeDecision("viewer", "/clients/3", "POST")).toBe("deny");
    expect(routeDecision("viewer", "/api/clients/3/skip-branding", "PATCH")).toBe("deny");
    expect(routeDecision("viewer", "/api/auth/logout", "POST")).toBe("allow");
  });

  it("limits a client viewer to their pages", () => {
    expect(routeDecision("viewer", "/", "GET")).toBe("allow");
    expect(routeDecision("viewer", "/clients/3/audits", "GET")).toBe("allow");
    expect(routeDecision("viewer", "/reports", "GET")).toBe("allow");
    expect(routeDecision("viewer", "/tools/robots", "GET")).toBe("deny");
    expect(routeDecision("viewer", "/agent", "GET")).toBe("deny");
    expect(routeDecision("viewer", "/settings", "GET")).toBe("deny");
  });

  it("gives a client viewer only the API reads that check the client", () => {
    expect(routeDecision("viewer", "/api/audits/7/progress", "GET")).toBe("allow");
    expect(routeDecision("viewer", "/api/report-archives/2/pdf", "GET")).toBe("allow");
    expect(routeDecision("viewer", "/api/auth/status", "GET")).toBe("allow");
    expect(routeDecision("viewer", "/api/tool-runs/actions", "GET")).toBe("deny");
    expect(routeDecision("viewer", "/api/v2/anything", "GET")).toBe("deny");
  });
});
