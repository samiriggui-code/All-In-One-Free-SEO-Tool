import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every server action can be called by any signed-in user with a POST,
 * whatever the page shows them. So each settings action that changes
 * something, or returns a secret, must check the role itself.
 */

// Reads the root layout and the shell call for everyone; they return no secrets.
const OPEN_READS = new Set([
  "getConnectionMode",
  "getAiConnectionStatus",
  "getThemePreference",
  "getLocalePreference",
  "getUiMode",
]);

const GUARD = /^\s*(await (requireEditor|requireSettingsAdmin)\(\);|\/\/ The toggle is in the shell)/;

/** Index of a function's body brace: past the params and any `Promise<{ … }>` return type. */
function bodyStart(src: string, from: number): number {
  let i = src.indexOf("(", from);
  for (let depth = 0; ; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) break;
  }
  for (let angle = 0, brace = 0; ; i++) {
    const c = src[i];
    if (c === "<") angle++;
    else if (c === ">" && src[i - 1] !== "=") angle--;
    else if (c === "{") {
      if (angle === 0 && brace === 0) return i;
      brace++;
    } else if (c === "}") brace--;
  }
}

function actionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return actionFiles(full);
    if (!/\.ts$/.test(name) || name.endsWith(".test.ts")) return [];
    return readFileSync(full, "utf8").startsWith('"use server"') ? [full] : [];
  });
}

describe("settings server actions", () => {
  const dir = path.join(process.cwd(), "src/app/settings");
  const files = actionFiles(dir).filter((f) => !f.includes(`${path.sep}team${path.sep}`));

  it("finds the action files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    it(`guards every action in ${path.relative(dir, file)}`, () => {
      const src = readFileSync(file, "utf8");
      const unguarded: string[] = [];
      for (const m of src.matchAll(/^export async function (\w+)\(/gm)) {
        if (OPEN_READS.has(m[1])) continue;
        // The guard must be the first statement of the body.
        const firstLine = src.slice(bodyStart(src, m.index!) + 1).split("\n")[1];
        if (!GUARD.test(firstLine)) unguarded.push(m[1]);
      }
      expect(unguarded).toEqual([]);
    });
  }
});
