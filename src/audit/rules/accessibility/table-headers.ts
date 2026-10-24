import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const tableHeadersRule = defineRule({
  id: "a11y-table-headers",
  name: "Table Headers",
  description: "Checks that data tables have proper headers",
  category: "a11y",
  weight: 6,
  run: (context) => {
    const { $ } = context;
    const issues: { table: string; issue: string; rows: number; cols: number; }[] = [];
    const tables: Array<{ hasHeaders: boolean; isLayout: boolean; }> = [];
    $("table").each((index, el) => {
      const $table = $(el);
      const role = $table.attr("role");
      const isLayoutTable = role === "presentation" || role === "none" || $table.hasClass("layout");
      const rows = $table.find("tr").length;
      const cols = $table.find("tr").first().find("td, th").length;
      if (isLayoutTable) {
        tables.push({ hasHeaders: true, isLayout: true });
        return;
      }
      if (rows <= 1 || cols <= 1) {
        return;
      }
      const tableId = $table.attr("id") || `table-${index + 1}`;
      const $headers = $table.find("th");
      if ($headers.length === 0) {
        issues.push({
          table: tableId,
          issue: "No header cells (<th>) found",
          rows,
          cols
        });
        tables.push({ hasHeaders: false, isLayout: false });
        return;
      }
      tables.push({ hasHeaders: true, isLayout: false });
      let headersWithoutScope = 0;
      $headers.each((_, th) => {
        const $th = $(th);
        const scope = $th.attr("scope");
        if (!(scope === "col" || scope === "row" || scope === "colgroup" || scope === "rowgroup")) {
          headersWithoutScope++;
        }
      });
      if (headersWithoutScope > 0 && rows > 2) {
        issues.push({
          table: tableId,
          issue: `${headersWithoutScope} header(s) missing scope attribute`,
          rows,
          cols
        });
      }
      const hasCaption = $table.find("caption").length > 0;
      const hasAriaLabel = !!$table.attr("aria-label") || !!$table.attr("aria-labelledby");
      if (!hasCaption && !hasAriaLabel && rows > 5) {
        issues.push({
          table: tableId,
          issue: "Large table without caption or aria-label",
          rows,
          cols
        });
      }
        const hasComplexStructure = $table.find("[colspan], [rowspan]").length > 0;
      if (hasComplexStructure && !$table.find("[headers]").length) {
        issues.push({
          table: tableId,
          issue: "Complex table (colspan/rowspan) may need id/headers attributes",
          rows,
          cols
        });
      }
    });
    const dataTables = tables.filter((t) => !t.isLayout);
    const tablesWithHeaders = dataTables.filter((t) => t.hasHeaders).length;
    if (dataTables.length === 0) {
      return pass("a11y-table-headers", "No data tables found on page", {
        layoutTables: tables.filter((t) => t.isLayout).length
      });
    }
    if (issues.length === 0) {
      return pass("a11y-table-headers", "All data tables have proper headers", {
        dataTables: dataTables.length,
        tablesWithHeaders
      });
    }
    const noHeaderIssues = issues.filter((i) => i.issue.includes("No header"));
    if (noHeaderIssues.length > 0) {
      return fail(
        "a11y-table-headers",
        `${noHeaderIssues.length} table(s) missing header cells`,
        {
          issues: issues.slice(0, 10),
          dataTables: dataTables.length
        }
      );
    }
    return warn(
      "a11y-table-headers",
      `Found ${issues.length} table accessibility issue(s)`,
      {
        issues,
        dataTables: dataTables.length,
        tablesWithHeaders
      }
    );
  }
});
