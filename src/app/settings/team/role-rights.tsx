import { getTranslations } from "next-intl/server";
import { Check, Eye, Minus, UserCheck } from "lucide-react";
import type { Role } from "@/db/schema";

/**
 * "Who can do what", GsKnora's role rights card. The cells restate the
 * rules the server applies (lib/permissions.ts for routes, lib/auth.ts
 * for actions and client scope); this table shows them, it does not
 * decide anything. Keep both in step: role-rights.test.ts checks the
 * rows that can be checked against permissions.ts.
 */

export type Right = "yes" | "assigned" | "read" | "no";

const ROLES: Role[] = ["owner", "manager", "member", "viewer"];

export const ROLE_RIGHTS: { key: string; cells: Record<Role, Right> }[] = [
  { key: "clients", cells: { owner: "yes", manager: "yes", member: "assigned", viewer: "assigned" } },
  { key: "work", cells: { owner: "yes", manager: "yes", member: "assigned", viewer: "no" } },
  { key: "reports", cells: { owner: "yes", manager: "yes", member: "assigned", viewer: "read" } },
  { key: "tools", cells: { owner: "yes", manager: "yes", member: "yes", viewer: "no" } },
  { key: "profile", cells: { owner: "yes", manager: "yes", member: "yes", viewer: "no" } },
  { key: "settings", cells: { owner: "yes", manager: "no", member: "no", viewer: "no" } },
  { key: "team", cells: { owner: "yes", manager: "no", member: "no", viewer: "no" } },
];

export async function RoleRights() {
  const t = await getTranslations("settingsTeam.rights");
  const tRoles = await getTranslations("auth.roles");

  return (
    <section className="glass-apple rounded-xl p-4 sm:p-6">
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("hint")}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("what")}</th>
              {ROLES.map((r) => (
                <th key={r} className="px-2 py-2 text-center font-medium">
                  {tRoles(r)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLE_RIGHTS.map((row) => (
              <tr key={row.key} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-3">{t(`rows.${row.key}`)}</td>
                {ROLES.map((r) => (
                  <td key={r} className="px-2 py-2 text-center">
                    <RightCell value={row.cells[r]} label={t(`values.${row.cells[r]}`)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Check className="size-3.5 text-emerald-500" />{t("values.yes")}</span>
        <span className="inline-flex items-center gap-1"><UserCheck className="size-3.5 text-sky-500" />{t("values.assigned")}</span>
        <span className="inline-flex items-center gap-1"><Eye className="size-3.5 text-amber-500" />{t("values.read")}</span>
        <span className="inline-flex items-center gap-1"><Minus className="size-3.5" />{t("values.no")}</span>
      </p>
    </section>
  );
}

function RightCell({ value, label }: { value: Right; label: string }) {
  const icon =
    value === "yes" ? (
      <Check className="size-4 text-emerald-500" />
    ) : value === "assigned" ? (
      <UserCheck className="size-4 text-sky-500" />
    ) : value === "read" ? (
      <Eye className="size-4 text-amber-500" />
    ) : (
      <Minus className="size-4 text-muted-foreground/60" />
    );
  return (
    <span className="inline-flex justify-center" title={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
