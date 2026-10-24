import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Any server action can be POSTed by id to any page, the public ones
 * included, so each exported action must check the sign-in itself.
 */

// Public by design: they check a share token or are meant for strangers.
const PUBLIC_FILES = new Set([
  "src/app/embed/grader/actions.ts",
  "src/app/portal/[token]/chat-actions.ts",
  "src/app/portal/[token]/quote-actions.ts",
]);

// Read by the root layout and the shell on every page, the login page included.
const OPEN_READS = new Set([
  "getConnectionMode",
  "getAiConnectionStatus",
  "getThemePreference",
  "getLocalePreference",
  "getUiMode",
]);

function serverFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return serverFiles(full);
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    return readFileSync(full, "utf8").startsWith('"use server"') ? [full] : [];
  });
}

describe("server actions", () => {
  const root = process.cwd();
  const files = serverFiles(path.join(root, "src"))
    .map((f) => path.relative(root, f).split(path.sep).join("/"))
    .filter((f) => !PUBLIC_FILES.has(f));

  it("finds the action files", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("each exported action checks the sign-in", () => {
    const unguarded: string[] = [];
    for (const file of files) {
      const src = readFileSync(path.join(root, file), "utf8");
      const starts = [...src.matchAll(/^export (?:async function (\w+)|const (\w+) = async)/gm)];
      for (const [i, m] of starts.entries()) {
        const name = m[1] ?? m[2];
        if (OPEN_READS.has(name)) continue;
        const body = src.slice(m.index!, starts[i + 1]?.index ?? src.length);
        if (!body.includes("await requireSignedIn();")) unguarded.push(`${file}: ${name}`);
      }
    }
    expect(unguarded).toEqual([]);
  });
});
