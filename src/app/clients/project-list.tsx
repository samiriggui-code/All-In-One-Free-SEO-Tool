import Link from "next/link";
import { Globe } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ProjectSummary } from "@/lib/projects";
import type { AuditFacts } from "@/lib/missions";
import { projectStage } from "@/lib/missions";

/**
 * A client's projects, one row each: name, address, live missions, stage
 * and score. Shared by /clients (one card per client) and the client page
 * (/clients/accounts/[id]) so the two never drift apart.
 */
export async function ProjectList({
  projects,
  facts,
}: {
  projects: ProjectSummary[];
  /** auditFacts() per project id. A missing entry reads as "to audit". */
  facts: Map<number, AuditFacts>;
}) {
  const t = await getTranslations("clients");
  const tm = await getTranslations("clientPage.missions");
  return (
    <ul className="divide-y divide-border">
      {projects.map((p) => {
        const f = facts.get(p.id);
        const stage = f ? projectStage(f) : "to_audit";
        const live = p.missions.filter((m) => m.status === "active" || m.status === "proposed");
        return (
          <li key={p.id}>
            <Link
              href={`/clients/${p.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-accent"
            >
              <Globe className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.url.replace(/^https?:\/\//, "")}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {live.length > 0 ? live.map((m) => tm(`kind_${m.kind}`)).join(", ") : t("noMission")}
              </span>
              <span
                className={
                  stage === "audited"
                    ? "gsk-tag gsk-tag--success"
                    : stage === "auditing"
                      ? "gsk-tag gsk-tag--warning"
                      : "gsk-tag gsk-tag--default"
                }
              >
                {t(`stage_${stage}`)}
              </span>
              <span className="w-14 text-right text-sm font-semibold tabular-nums">
                {f?.score ?? "—"}
                <span className="text-xs font-normal text-muted-foreground">/100</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
