import { describe, expect, it } from "vitest";
import { getTemplatesByKey, STACK_LABELS } from "./tech-stack-templates";
import {
  agentTaskWanted,
  engineTaskWanted,
  planPriorityFromTitle,
  TEMPLATE_AUDIT_EQUIVALENTS,
  templateAuditType,
  untouched,
} from "./task-dedupe";

const none = new Set<string>();

describe("engineTaskWanted", () => {
  it("keeps P0 and P1, drops P2 and P3", () => {
    expect(engineTaskWanted({ type: "seomator:technical-404-page", planPriority: "P0" }, none)).toBe(true);
    expect(engineTaskWanted({ type: "seomator:technical-www-redirect", planPriority: "P1" }, none)).toBe(true);
    expect(engineTaskWanted({ type: "seomator:social-og-image-size", planPriority: "P3" }, none)).toBe(false);
    expect(engineTaskWanted({ type: "seomator:a11y-main-landmark", planPriority: "P2" }, none)).toBe(false);
    expect(engineTaskWanted({ type: "seomator:x", planPriority: null }, none)).toBe(false);
  });

  it("drops what our audit already has a task for, whatever the page", () => {
    const open = new Set(["missing_robots_txt", "missing_h1", "no_https"]);
    expect(engineTaskWanted({ type: "seomator:technical-robots-txt-exists", planPriority: "P0" }, open)).toBe(false);
    expect(engineTaskWanted({ type: "seomator:js-rendered-h1", planPriority: "P0" }, open)).toBe(false);
    expect(engineTaskWanted({ type: "seomator:security-https-redirect", planPriority: "P0" }, open)).toBe(false);
    expect(engineTaskWanted({ type: "seomator:technical-sitemap-exists", planPriority: "P0" }, open)).toBe(true);
  });

  it("never turns the single-H1 rule into a task", () => {
    expect(engineTaskWanted({ type: "seomator:core-h1-single", planPriority: "P0" }, none)).toBe(false);
  });
});

describe("planPriorityFromTitle", () => {
  it("reads the bracketed priority of older engine tasks", () => {
    expect(planPriorityFromTitle("[P2] Main Landmark: fix on https://x/")).toBe("P2");
    expect(planPriorityFromTitle("Add an H1 heading to /")).toBeNull();
  });
});

describe("templates", () => {
  it("only names templates that exist", () => {
    const titles = new Set(
      (Object.keys(STACK_LABELS) as (keyof typeof STACK_LABELS)[]).flatMap((k) => getTemplatesByKey(k).map((t) => t.title)),
    );
    expect(Object.keys(TEMPLATE_AUDIT_EQUIVALENTS).filter((t) => !titles.has(t))).toEqual([]);
  });

  it("maps a duplicate template to its audit type", () => {
    expect(templateAuditType("Generate and submit a sitemap.xml")).toBe("missing_sitemap");
    expect(templateAuditType("Configure proper cache-control headers for static assets")).toBeNull();
  });
});

describe("untouched", () => {
  it("is only an untouched, unassigned task still to do", () => {
    expect(untouched({ status: "todo", actualMinutes: null, assignedUserId: null })).toBe(true);
    expect(untouched({ status: "todo", actualMinutes: 15, assignedUserId: null })).toBe(false);
    expect(untouched({ status: "todo", actualMinutes: null, assignedUserId: 3 })).toBe(false);
    expect(untouched({ status: "in_progress", actualMinutes: null, assignedUserId: null })).toBe(false);
  });
});

describe("agentTaskWanted", () => {
  const existing = [
    { sourceRef: "audit:missing_h1", title: "Ajouter un titre <h1>" },
    { sourceRef: "seomator:technical-www-redirect", title: "[P0] Redirection www" },
    { sourceRef: null, title: "Generate and submit a sitemap.xml" },
  ];
  it("skips what the audit, the engine or a template already covers", () => {
    expect(agentTaskWanted("missing_h1", existing)).toBe(false);
    expect(agentTaskWanted("seomator:technical-www-redirect", existing)).toBe(false);
    expect(agentTaskWanted("missing_sitemap", existing)).toBe(false);
    expect(agentTaskWanted("seomator:js-rendered-h1", existing)).toBe(false);
    expect(agentTaskWanted("seomator:core-h1-single", [])).toBe(false);
  });

  it("fills a real gap", () => {
    expect(agentTaskWanted("missing_og_tags", existing)).toBe(true);
  });
});
