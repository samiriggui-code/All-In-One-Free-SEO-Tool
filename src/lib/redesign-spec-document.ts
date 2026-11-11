/**
 * The redesign specification as a document: sections of plain blocks,
 * worded through the `redesignSpec` messages. The page draws the blocks
 * and the Markdown export writes them, so the two never say different
 * things.
 */

import {
  CHECKS_AFTER,
  CHECKS_BEFORE,
  pathOf,
  type RedesignSpec,
} from "./redesign-spec";
import type { SpecLabels } from "./redesign-spec-data";

type T = (key: string, values?: Record<string, string | number>) => string;

export type SpecBlock =
  | { kind: "facts"; rows: [string, string][] }
  | { kind: "bullets"; items: string[] }
  | { kind: "note"; text: string }
  | {
      kind: "issues";
      items: { severity: string; severityLabel: string; title: string; why: string | null; count: string; pages: string[]; more: string | null }[];
    }
  | { kind: "requirements"; items: { title: string; detail: string; failing: boolean; tag: string }[] }
  | { kind: "table"; head: string[]; rows: { cells: string[]; state?: "ok" | "ko" | null }[] }
  | { kind: "checklists"; groups: { title: string; items: string[] }[] };

export type SpecSection = { id: string; title: string; hint?: string; blocks: SpecBlock[] };

export type SpecDocument = { title: string; basis: string | null; warning: string | null; sections: SpecSection[] };

function formatMetric(metric: "lcp" | "cls" | "inp", value: number, locale: string): string {
  const nf = (digits: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits });
  if (metric === "cls") return nf(2).format(value);
  if (metric === "lcp") return `${nf(1).format(value / 1000)} s`;
  return `${nf(0).format(value)} ms`;
}

export function specDocument(spec: RedesignSpec, labels: SpecLabels, t: T, locale: string): SpecDocument {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const audit = spec.audit;

  const sections: SpecSection[] = [];

  const facts: [string, string][] = [
    [t("site"), spec.project.url],
    [t("stack"), spec.mission.targetStack?.trim() || t("stackNone")],
  ];
  if (audit) {
    facts.push([t("pagesRead"), String(audit.pagesCrawled ?? spec.pages.length)]);
    facts.push([t("scoreNow"), audit.score === null ? "—" : `${audit.score}/100`]);
  }
  facts.push([t("scoreTarget"), `${spec.targetScore}/100`]);
  if (spec.mission.notes?.trim()) facts.push([t("notes"), spec.mission.notes.trim()]);
  sections.push({ id: "context", title: t("s1"), blocks: [{ kind: "facts", rows: facts }] });

  sections.push({
    id: "goals",
    title: t("s2"),
    blocks: [
      {
        kind: "bullets",
        items: [t("goalKeep"), t("goalScore", { score: spec.targetScore }), t("goalCwv"), t("goalFix")],
      },
    ],
  });

  if (audit) {
    sections.push({
      id: "weak",
      title: t("s3"),
      hint: t("s3Hint"),
      blocks:
        spec.weakCategories.length === 0
          ? [{ kind: "note", text: t("s3Empty") }]
          : [
              {
                kind: "facts",
                rows: spec.weakCategories.map((c) => [labels[`category:${c.id}`]?.title ?? c.id, `${c.score}/100`]),
              },
            ],
    });

    sections.push({
      id: "issues",
      title: t("s4"),
      hint: t("s4Hint"),
      blocks:
        spec.mustFix.length === 0
          ? [{ kind: "note", text: t("s4Empty") }]
          : [
              {
                kind: "issues",
                items: spec.mustFix.map((m) => ({
                  severity: m.severity,
                  severityLabel: t(`sev_${m.severity}`),
                  title: labels[m.type]?.title ?? m.type,
                  why: labels[m.type]?.why ?? null,
                  count: t("pagesCount", { count: m.pageCount }),
                  pages: m.pages.map(pathOf),
                  more: m.pageCount > m.pages.length ? t("andMore", { count: m.pageCount - m.pages.length }) : null,
                })),
              },
            ],
    });
  }

  sections.push({
    id: "requirements",
    title: t("s5"),
    hint: t("s5Hint"),
    blocks: [
      {
        kind: "requirements",
        items: spec.requirements.map((r) => ({
          title: t(`req.${r.id}.t`),
          detail: t(`req.${r.id}.d`),
          failing: r.failing,
          tag: r.failing ? t("found") : t("standard"),
        })),
      },
    ],
  });

  sections.push({
    id: "cwv",
    title: t("s6"),
    hint: t("s6Hint"),
    blocks: [
      {
        kind: "table",
        head: [t("metric"), t("now"), t("target"), t("state")],
        rows: spec.cwv.map((c) => ({
          cells: [
            t(c.metric),
            c.current === null ? t("notMeasured") : formatMetric(c.metric, c.current, locale),
            `≤ ${formatMetric(c.metric, c.target, locale)}`,
            c.ok === null ? "—" : c.ok ? t("ok") : t("ko"),
          ],
          state: c.ok === null ? null : c.ok ? "ok" : "ko",
        })),
      },
    ],
  });

  sections.push({
    id: "redirects",
    title: t("s7"),
    hint: t("s7Hint"),
    blocks:
      spec.pages.length === 0
        ? [{ kind: "note", text: t("pagesNone") }]
        : [
            {
              kind: "table",
              head: [t("oldUrl"), t("newUrl"), t("type")],
              rows: spec.pages.map((p) => ({ cells: [pathOf(p), "", t("same")] })),
            },
          ],
  });

  sections.push({
    id: "acceptance",
    title: t("s8"),
    blocks: [
      {
        kind: "checklists",
        groups: [
          { title: t("before"), items: CHECKS_BEFORE.map((c) => t(`chk.${c}`)) },
          { title: t("after"), items: CHECKS_AFTER.map((c) => t(`chk.${c}`)) },
        ],
      },
    ],
  });

  return {
    title: t("title", { name: spec.project.name }),
    basis: audit
      ? t("basis", { mode: audit.mode === "quick" ? t("modeQuick") : t("modeFull"), date: date.format(audit.at) })
      : null,
    warning: !audit ? t("noAudit") : audit.mode === "quick" ? t("quickWarning") : null,
    sections,
  };
}

/** The same document as Markdown, for the file the developers receive. */
export function specMarkdown(doc: SpecDocument): string {
  const out: string[] = [`# ${doc.title}`, ""];
  if (doc.basis) out.push(`_${doc.basis}_`, "");
  if (doc.warning) out.push(`> ${doc.warning}`, "");
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  for (const s of doc.sections) {
    out.push(`## ${s.title}`, "");
    if (s.hint) out.push(`_${s.hint}_`, "");
    for (const b of s.blocks) {
      switch (b.kind) {
        case "facts":
          for (const [k, v] of b.rows) out.push(`- **${k}** : ${v}`);
          break;
        case "bullets":
          for (const i of b.items) out.push(`- ${i}`);
          break;
        case "note":
          out.push(b.text);
          break;
        case "issues":
          for (const i of b.items) {
            out.push(`### ${i.title}`, "", `**${i.severityLabel}** · ${i.count}`, "");
            if (i.why) out.push(i.why, "");
            for (const p of i.pages) out.push(`- \`${p}\``);
            if (i.more) out.push(`- ${i.more}`);
            out.push("");
          }
          break;
        case "requirements":
          for (const r of b.items) out.push(`- **${r.title}**${r.failing ? ` (${r.tag})` : ""} : ${r.detail}`);
          break;
        case "table":
          out.push(`| ${b.head.map(cell).join(" | ")} |`, `|${b.head.map(() => " --- ").join("|")}|`);
          for (const r of b.rows) out.push(`| ${r.cells.map(cell).join(" | ")} |`);
          break;
        case "checklists":
          for (const g of b.groups) {
            out.push(`### ${g.title}`, "");
            for (const i of g.items) out.push(`- [ ] ${i}`);
            out.push("");
          }
          break;
      }
      out.push("");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
