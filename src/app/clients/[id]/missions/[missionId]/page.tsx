export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { mayAccessClient } from "@/lib/client-scope";
import { loadSpecDocument } from "@/lib/redesign-spec-data";
import type { SpecBlock } from "@/lib/redesign-spec-document";
import { PrintButton } from "./print-button";

/**
 * The specification of a redesign mission, generated from the project's
 * audit (lib/redesign-spec.ts). Read here, printed to PDF for the client,
 * or downloaded as Markdown for the developers.
 */
export default async function RedesignSpecPage({
  params,
}: {
  params: Promise<{ id: string; missionId: string }>;
}) {
  const { id, missionId } = await params;
  const projectId = Number(id);
  const mission = Number(missionId);
  if (!Number.isInteger(projectId) || !Number.isInteger(mission)) notFound();
  if (!(await mayAccessClient(projectId))) notFound();

  const doc = await loadSpecDocument(projectId, mission);
  if (!doc) notFound();
  const t = await getTranslations("redesignSpec");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Printing keeps the document only: no sidebar, tabs or buttons. */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #redesign-spec, #redesign-spec * { visibility: visible !important; }
        #redesign-spec { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0 !important; }
        #redesign-spec section { break-inside: avoid-page; }
      }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/clients/${projectId}?tab=missions`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>
        <div className="flex items-center gap-2">
          <a href={`/clients/${projectId}/missions/${mission}/cahier.md`} className="gsk-btn">
            <Download className="size-4" />
            {t("download")}
          </a>
          <PrintButton label={t("print")} />
        </div>
      </div>

      <article id="redesign-spec" className="space-y-8 rounded-lg border border-border bg-card p-6 sm:p-10">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
          {doc.basis && <p className="text-sm text-muted-foreground">{doc.basis}</p>}
          {doc.warning && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              {doc.warning}
            </p>
          )}
        </header>

        {doc.sections.map((s) => (
          <section key={s.id} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              {s.hint && <p className="mt-0.5 text-sm text-muted-foreground">{s.hint}</p>}
            </div>
            {s.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}

function Block({ block: b }: { block: SpecBlock }) {
  switch (b.kind) {
    case "facts":
      return (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[14rem_1fr]">
          {b.rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="whitespace-pre-line break-words font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      );
    case "bullets":
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {b.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      );
    case "note":
      return <p className="text-sm text-muted-foreground">{b.text}</p>;
    case "issues":
      return (
        <ol className="space-y-3">
          {b.items.map((i) => (
            <li key={i.title} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    i.severity === "critical" || i.severity === "high" ? "gsk-tag gsk-tag--warning" : "gsk-tag gsk-tag--default"
                  }
                >
                  {i.severityLabel}
                </span>
                <h3 className="text-sm font-semibold">{i.title}</h3>
                <span className="text-xs text-muted-foreground">· {i.count}</span>
              </div>
              {i.why && <p className="mt-1.5 text-sm text-muted-foreground">{i.why}</p>}
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {i.pages.map((p) => (
                  <li key={p} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {p}
                  </li>
                ))}
                {i.more && <li className="px-1.5 py-0.5 text-xs text-muted-foreground">{i.more}</li>}
              </ul>
            </li>
          ))}
        </ol>
      );
    case "requirements":
      return (
        <ul className="divide-y divide-border rounded-md border border-border">
          {b.items.map((r) => (
            <li key={r.title} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{r.detail}</p>
              </div>
              <span className={r.failing ? "gsk-tag gsk-tag--warning" : "gsk-tag gsk-tag--default"}>{r.tag}</span>
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                {b.head.map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.cells.map((c, j) => (
                    <td
                      key={j}
                      className={`px-3 py-2 ${j === 0 ? "font-mono text-xs" : ""} ${
                        j === r.cells.length - 1 && r.state === "ok"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : j === r.cells.length - 1 && r.state === "ko"
                            ? "text-red-600 dark:text-red-400"
                            : ""
                      }`}
                    >
                      {c || <span className="inline-block h-4 w-40 border-b border-dashed border-border" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "checklists":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {b.groups.map((g) => (
            <div key={g.title} className="rounded-md border border-border p-4">
              <h3 className="text-sm font-semibold">{g.title}</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {g.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 inline-block size-4 shrink-0 rounded border border-border" aria-hidden />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
  }
}
