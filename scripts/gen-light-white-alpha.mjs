#!/usr/bin/env node
/**
 * Génère src/app/light-white-alpha.css.
 *
 * L'app a été écrite pour le mode sombre : cadres, séparateurs et fonds
 * légers utilisent du blanc transparent (border-white/10, bg-white/5,
 * ring-white/10, divide-white/5…). Sur fond blanc ils disparaissent, et
 * --color-white ne peut pas être redéfini en mode clair puisqu'il sert
 * aussi au texte des boutons (text-white).
 *
 * Ce script relève toutes ces classes dans src/ et écrit, pour le mode
 * clair seulement (:root:not(.dark)), une règle qui remplace le blanc par
 * l'encre de l'interface avec la même transparence (un peu renforcée pour
 * les traits, qui sinon restent trop pâles sur blanc).
 *
 * Couvre aussi bg-black/<alpha> jusqu'à 45 % (panneaux « en creux » du mode
 * sombre), sauf les voiles en inset-0.
 *
 * Usage : node scripts/gen-light-white-alpha.mjs
 * À relancer quand de nouvelles classes *-white/<alpha> apparaissent.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const OUT = join(SRC, "app", "light-white-alpha.css");

const RE =
  /(?<![\w:-])((?:hover|group-hover|open):)?(border(?:-[trblxy])?|bg|ring|divide)-white\/(\[[0-9.]+\]|[0-9]+)(?![\w-])/g;

// Dark "inset" panels (bg-black/20 and friends) read as grey slabs on
// white. Up to 45 %: above that, and on anything with inset-0, it is a
// backdrop behind a dialog and stays as it is.
const RE_BLACK = /(?<![\w:-])((?:hover):)?bg-black\/(\[[0-9.]+\]|[0-9]+)(?![\w-])/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name)) yield p;
  }
}

const found = new Map();
for (const file of walk(SRC)) {
  for (const m of readFileSync(file, "utf8").matchAll(RE)) {
    found.set(m[0], { variant: m[1] ?? "", kind: m[2], alpha: m[3] });
  }
  for (const m of readFileSync(file, "utf8").matchAll(RE_BLACK)) {
    found.set(m[0], { variant: m[1] ?? "", kind: "bg-black", alpha: m[2] });
  }
}

const BORDER_PROP = {
  border: "border-color",
  "border-t": "border-top-color",
  "border-r": "border-right-color",
  "border-b": "border-bottom-color",
  "border-l": "border-left-color",
  "border-x": "border-inline-color",
  "border-y": "border-block-color",
};

const toAlpha = (a) => (a.startsWith("[") ? Number(a.slice(1, -1)) : Number(a) / 100);
const esc = (cls) => cls.replace(/[:/[\].]/g, (c) => `\\${c}`);

const rules = [];
for (const [cls, { variant, kind, alpha }] of [...found].sort(([a], [b]) => a.localeCompare(b))) {
  const a = toAlpha(alpha);
  if (kind === "bg-black") {
    if (a > 0.45) continue;
    const pct = Math.round(Math.min(Math.max(a * 0.2, 0.02), 0.05) * 1000) / 10;
    const sel = `:where(:root:not(.dark)) .${esc(cls)}:not([class~=\"inset-0\"])${variant === "hover:" ? ":hover" : ""}`;
    rules.push(`  ${sel} { background-color: color-mix(in oklab, var(--foreground) ${pct}%, transparent); }`);
    continue;
  }
  // Opaque white surfaces (bg-white/80, /95…) are intentional: leave them.
  if (a >= 0.5) continue;

  const line = kind !== "bg";
  // Lines need a floor and a small boost to read on white; fills keep their alpha.
  const pct = Math.round((line ? Math.min(Math.max(a * 1.3, 0.08), 0.3) : Math.max(a, 0.02)) * 1000) / 10;
  const color = `color-mix(in oklab, var(--foreground) ${pct}%, transparent)`;

  // :where() keeps the theme test at zero specificity: each rule weighs the
  // same as the utility it replaces and wins only by coming later in the
  // utilities layer, so data-/aria-/hover: variants of other colours on the
  // same element still apply.
  let sel = `:where(:root:not(.dark)) .${esc(cls)}`;
  if (variant === "hover:") sel += ":hover";
  else if (variant === "group-hover:") sel = `:where(:root:not(.dark)) :where(.group):hover .${esc(cls)}`;
  else if (variant === "open:") sel += ":is([open], :popover-open)";

  const decl =
    kind === "bg" ? `background-color: ${color};`
    : kind === "ring" ? `--tw-ring-color: ${color};`
    : kind === "divide" ? null
    : `${BORDER_PROP[kind]}: ${color};`;

  if (kind === "divide") {
    rules.push(`  ${sel} > :not(:last-child) { border-color: ${color}; }`);
  } else {
    rules.push(`  ${sel} { ${decl} }`);
  }
}

const header = `/* Généré par scripts/gen-light-white-alpha.mjs — ne pas modifier à la main.
   Mode clair : les cadres et fonds en blanc transparent (pensés pour le
   mode sombre) passent sur l'encre de l'interface. */
`;
writeFileSync(OUT, header + "@layer utilities {\n@media all {\n" + rules.join("\n") + "\n}\n}\n");
console.log(`${rules.length} règles écrites dans ${relative(ROOT, OUT)}`);
