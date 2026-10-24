// Bundles src/lib/content-studio/methodologies/*.md into a TS module.
//
// BlogPilot read these files from disk at runtime. This app builds with
// `output: "standalone"`, where the file tracer only copies what an
// import reaches, so a runtime readdir finds nothing in production.
// Generating a module makes them part of the bundle.
//
// Run `pnpm gen:methodologies` after editing a .md file. The content
// studio's tests fail when the generated file drifts from the sources.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const METHODOLOGY_DIR = path.join(root, "src/lib/content-studio/methodologies");
export const GENERATED_FILE = path.join(METHODOLOGY_DIR, "methodologies.generated.ts");

/** Frontmatter here is flat `key: value` lines; no YAML parser needed. */
export function parseMethodology(fileName, raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  const data = {};
  let body = raw;
  if (m) {
    body = m[2];
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
      if (key) data[key] = value;
    }
  }
  const entry = {
    id: data.id || fileName.replace(/\.md$/, ""),
    title: data.title || fileName,
    body: body.trim(),
  };
  for (const k of ["when", "inputs", "outputs", "source"]) if (data[k]) entry[k] = data[k];
  return entry;
}

export function renderGenerated() {
  const files = readdirSync(METHODOLOGY_DIR).filter((f) => f.endsWith(".md")).sort();
  const entries = files.map((f) => parseMethodology(f, readFileSync(path.join(METHODOLOGY_DIR, f), "utf8")));
  return [
    "// GENERATED FILE — do not edit by hand.",
    "// Source: ./*.md. Run `pnpm gen:methodologies` to refresh.",
    'import type { Methodology } from "./loader";',
    "",
    `export const METHODOLOGIES: Methodology[] = ${JSON.stringify(entries, null, 2)};`,
    "",
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(GENERATED_FILE, renderGenerated());
  console.log(`Wrote ${path.relative(root, GENERATED_FILE)}`);
}
