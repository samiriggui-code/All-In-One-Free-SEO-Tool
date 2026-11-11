/**
 * Every per-client route is behind the client-scope layout.
 *
 * components/shell/client-scope-layout.tsx refuses a client the signed-in
 * user is not assigned to, but only where a `c/[clientId]` folder re-exports
 * it as its layout. /findings/c/[clientId] had none: a member limited to
 * some clients could read any other client's findings by changing the id
 * in the address. This walks src/app so the next per-client folder cannot
 * be added without it either.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), "src", "app");

function clientFolders(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (name === "[clientId]" && path.basename(dir) === "c") out.push(full);
    else clientFolders(full, out);
  }
  return out;
}

const LAYOUT = /export\s*\{\s*default\s*\}\s*from\s*["']@\/components\/shell\/client-scope-layout["']/;

describe("per-client routes", () => {
  const folders = clientFolders(APP);

  it("finds the per-client folders", () => {
    // 26 when this was written; a big drop means the walk is broken.
    expect(folders.length).toBeGreaterThan(20);
  });

  it("each one re-exports the client-scope layout", () => {
    const missing = folders
      .filter((f) => {
        const file = path.join(f, "layout.tsx");
        return !existsSync(file) || !LAYOUT.test(readFileSync(file, "utf8"));
      })
      .map((f) => path.relative(APP, f).split(path.sep).join("/"));
    expect(missing).toEqual([]);
  });
});
