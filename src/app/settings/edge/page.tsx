export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Globe } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { getEdgeToken } from "@/lib/edge-token";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { EdgeSetup } from "./setup";
import { requireSettingsPage } from "../access";

/**
 * Installing the edge worker.
 *
 * Automatic fixes go through the WordPress plugin, so a PHP site, a
 * static site or a React app gets the finding and the instructions and
 * nothing else. This is the answer for anything behind Cloudflare,
 * whatever it is built in.
 *
 * The page leads with why this rather than the pixel every paid tool
 * uses, because that is the decision the reader is actually making and
 * the reason is not obvious.
 */
export default async function EdgeSettingsPage() {
  await requireSettingsPage("/settings/edge", { owner: true });
  const tx = await getTranslations("ui.app_settings_edge_page");
  const [token, rows] = await Promise.all([
    getEdgeToken(),
    db.select({ id: clients.id, name: clients.name, url: clients.url }).from(clients),
  ]);

  let worker = "";
  try {
    worker = await readFile(
      join(process.cwd(), "edge-worker/seo-tool-worker.js"),
      "utf8",
    );
  } catch {
    worker = "";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <PageHeader
          title={tx("edgeWorker")}
          description={tx("applyFixesToAnySite")}
          icon={Globe}
          accent="cyan"
        />
      </div>

      <section className="glass-apple rounded-2xl p-5 text-sm text-muted-foreground">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          {tx("whyAWorkerAndNot")}
        </h2>
        <p>
          {tx("thePaidToolsThatApply")}
        </p>
        <p className="mt-2">
          {tx("soAFixAppliedThat")}
        </p>
      </section>

      <EdgeSetup
        hasToken={Boolean(token)}
        appUrl=""
        clients={rows.map((c) => ({ id: c.id, name: c.name, url: c.url }))}
        workerSource={worker}
      />

      <section className="glass-apple rounded-2xl p-5">
        <h2 className="mb-2 text-sm font-semibold">{tx("checkingItWorks")}</h2>
        <p className="text-sm text-muted-foreground">
          {tx("theWorkerSetsAHeader")}
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 text-[12px] leading-relaxed text-foreground/90">
          curl -sI https://yoursite.com | grep x-seo-tool
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          {tx.rich("xSeoToolTitleDescription", { b0: (chunks) => <code>{chunks}</code>, b1: (chunks) => <code>{chunks}</code> })}
        </p>
      </section>
    </div>
  );
}
