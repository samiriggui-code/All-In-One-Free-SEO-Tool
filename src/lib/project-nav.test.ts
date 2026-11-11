import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { activeProjectPage, allProjectPageHrefs, isLocalProject, projectTabs } from "./project-nav";

const APP = path.join(process.cwd(), "src", "app");

/** "/audits/c/:id" -> src/app/audits/c/[clientId]/page.tsx */
function pageFile(href: string): string {
  const route = href.split("?")[0];
  const segs = route
    .split("/")
    .filter(Boolean)
    .map((s) => (s === ":id" ? (route.startsWith("/clients/") ? "[id]" : "[clientId]") : s));
  return path.join(APP, ...segs, "page.tsx");
}

function clientFolders(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (name === "[clientId]" && path.basename(dir) === "c") out.push(full);
    else clientFolders(full, out);
  }
  return out;
}

describe("project tabs", () => {
  it("only link to pages that exist", () => {
    const missing = allProjectPageHrefs().filter((h) => !existsSync(pageFile(h)));
    expect(missing).toEqual([]);
  });

  it("give every per-client page a tab", () => {
    const linked = new Set(allProjectPageHrefs().map((h) => h.split("?")[0]));
    const orphans = clientFolders(APP)
      .map((f) => "/" + path.relative(APP, path.dirname(path.dirname(f))).split(path.sep).join("/") + "/c/:id")
      .filter((h) => !linked.has(h));
    expect(orphans).toEqual([]);
  });

  it("hide Local unless the project is local", () => {
    const groups = (local: boolean) => projectTabs(7, { local }).map((t) => t.group);
    expect(groups(false)).not.toContain("local");
    expect(groups(true)).toContain("local");
    expect(isLocalProject({ niche: "local", gbpUrl: null })).toBe(true);
    expect(isLocalProject({ niche: "saas", gbpUrl: "https://maps.app.goo.gl/x" })).toBe(true);
    expect(isLocalProject({ niche: "ecommerce", gbpUrl: "  " })).toBe(false);
    expect(isLocalProject({ niche: null, gbpUrl: null })).toBe(false);
  });

  it("fill in the project id", () => {
    const audit = projectTabs(7, { local: false }).find((t) => t.group === "audit");
    expect(audit?.href).toBe("/audits/c/7");
  });
});

describe("activeProjectPage", () => {
  it("knows the project page and its ?tab=", () => {
    expect(activeProjectPage("/clients/7", null, 7)).toEqual({ group: "overview", key: "overview" });
    expect(activeProjectPage("/clients/7", "settings", 7)).toEqual({ group: "settings", key: "settings" });
    expect(activeProjectPage("/clients/7/onboarding", "settings", 7)).toEqual({ group: "overview", key: "overview" });
    expect(activeProjectPage("/clients/7/missions/3", null, 7)).toEqual({ group: "missions", key: "missions" });
  });

  it("files sub-pages under their parent", () => {
    expect(activeProjectPage("/content/c/7/p/3", null, 7)).toEqual({ group: "keywords", key: "content" });
    expect(activeProjectPage("/gbp/c/7/reviews", null, 7)).toEqual({ group: "local", key: "gbp" });
    expect(activeProjectPage("/tools/geo-swot/c/7", null, 7)).toEqual({ group: "ai", key: "geoSwot" });
  });

  it("does not confuse prefixes or other projects", () => {
    expect(activeProjectPage("/content-gap/c/7", null, 7)).toEqual({ group: "keywords", key: "contentGap" });
    expect(activeProjectPage("/audits/c/70", null, 7)).toBeNull();
    expect(activeProjectPage("/settings", null, 7)).toBeNull();
  });
});
