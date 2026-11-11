import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const PROJECT_TABS = ["overview", "missions", "settings"] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

export function parseProjectTab(raw: string | string[] | undefined): ProjectTab {
  return (PROJECT_TABS as readonly string[]).includes(String(raw)) ? (raw as ProjectTab) : "overview";
}

/**
 * Tabs of a project page. The page used to stack fifteen blocks; they are
 * sorted into what the project is (overview), what was agreed on it
 * (missions) and how it is connected (settings).
 */
export async function ProjectTabs({
  projectId,
  active,
  missionCount,
}: {
  projectId: number;
  active: ProjectTab;
  missionCount: number;
}) {
  const t = await getTranslations("clientPage.tabs");
  return (
    <nav className="gsk-tabbar mb-0" aria-label={t("aria")}>
      {PROJECT_TABS.map((tab) => (
        <Link
          key={tab}
          href={tab === "overview" ? `/clients/${projectId}` : `/clients/${projectId}?tab=${tab}`}
          aria-current={active === tab ? "page" : undefined}
          className="gsk-tab"
          scroll={false}
        >
          {t(tab)}
          {tab === "missions" && missionCount > 0 ? (
            <span className="gsk-tab__count">{missionCount}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
