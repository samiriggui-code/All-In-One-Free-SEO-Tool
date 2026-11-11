/**
 * Every file export checks whose data it hands out.
 *
 * The middleware only checks the role, and a client viewer may open
 * /clients, /audits, /tasks and /keywords, so their exports too. Eight
 * CSV exports read every row of the agency: a client contact could
 * download the agency's whole client list. Layouts do not run for route
 * handlers, so the per-project plan exports had no check at all. This
 * walks src/app so the next export cannot ship without one.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), "src", "app");

function exportRoutes(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "api") continue; // API routes have their own prefixes and checks.
      exportRoutes(full, out);
    } else if (name === "route.ts" && /(\.csv|\.pdf|\.md|export)$/.test(path.basename(dir))) {
      out.push(full);
    }
  }
  return out;
}

const CHECKS = /clientScope|scopedClientIds|guardClientRequest|requireClientAccess|canSeeClient|mayAccessClient/;

describe("file exports", () => {
  const routes = exportRoutes(APP);

  it("are found", () => {
    expect(routes.length).toBeGreaterThan(8);
  });

  it.each(routes.map((r) => [path.relative(APP, r)]))("%s checks access", (rel) => {
    expect(readFileSync(path.join(APP, rel), "utf8")).toMatch(CHECKS);
  });
});
