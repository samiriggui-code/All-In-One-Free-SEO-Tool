import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const VALID_ROLES = /* @__PURE__ */ new Set([
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "blockquote",
  "button",
  "caption",
  "cell",
  "checkbox",
  "code",
  "columnheader",
  "combobox",
  "complementary",
  "contentinfo",
  "definition",
  "deletion",
  "dialog",
  "document",
  "emphasis",
  "feed",
  "figure",
  "form",
  "generic",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "insertion",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "meter",
  "navigation",
  "none",
  "note",
  "option",
  "paragraph",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "strong",
  "subscript",
  "superscript",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "time",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem"
]);
export const DEPRECATED_ROLES = /* @__PURE__ */ new Set(["directory", "doc-biblioentry", "doc-endnote"]);
export const VALID_ARIA_ATTRS = /* @__PURE__ */ new Set([
  "aria-activedescendant",
  "aria-atomic",
  "aria-autocomplete",
  "aria-braillelabel",
  "aria-brailleroledescription",
  "aria-busy",
  "aria-checked",
  "aria-colcount",
  "aria-colindex",
  "aria-colindextext",
  "aria-colspan",
  "aria-controls",
  "aria-current",
  "aria-describedby",
  "aria-description",
  "aria-details",
  "aria-disabled",
  "aria-dropeffect",
  "aria-errormessage",
  "aria-expanded",
  "aria-flowto",
  "aria-grabbed",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-level",
  "aria-live",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-orientation",
  "aria-owns",
  "aria-placeholder",
  "aria-posinset",
  "aria-pressed",
  "aria-readonly",
  "aria-relevant",
  "aria-required",
  "aria-roledescription",
  "aria-rowcount",
  "aria-rowindex",
  "aria-rowindextext",
  "aria-rowspan",
  "aria-selected",
  "aria-setsize",
  "aria-sort",
  "aria-valuemax",
  "aria-valuemin",
  "aria-valuenow",
  "aria-valuetext"
]);
export const BOOLEAN_ARIA = /* @__PURE__ */ new Set([
  "aria-atomic",
  "aria-busy",
  "aria-disabled",
  "aria-hidden",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-readonly",
  "aria-required"
]);
export const ariaValidRule = defineRule({
  id: "a11y-aria-valid",
  name: "Valid ARIA Roles and Attributes",
  description: "Checks that ARIA roles exist and aria-* attributes are spelled correctly",
  category: "a11y",
  weight: 5,
  run: (context) => {
    const { $, url } = context;
    const issues: { problem: string; detail: string; }[] = [];
    $("[role]").each((_, el) => {
      const raw = $(el).attr("role")?.trim().toLowerCase();
      if (!raw) return;
      for (const role of raw.split(/\s+/)) {
        if (DEPRECATED_ROLES.has(role)) {
          issues.push({ problem: "deprecated-role", detail: role });
        } else if (!VALID_ROLES.has(role)) {
          issues.push({ problem: "invalid-role", detail: role });
        }
      }
    });
    $("*").each((_, el) => {
      const attribs = "attribs" in el ? el.attribs : undefined;
      if (!attribs) return;
      for (const [name, value] of Object.entries(attribs)) {
        if (!name.startsWith("aria-")) continue;
        if (!VALID_ARIA_ATTRS.has(name)) {
          issues.push({ problem: "invalid-attribute", detail: name });
          continue;
        }
        if (BOOLEAN_ARIA.has(name) && !["true", "false", ""].includes(value.trim().toLowerCase())) {
          issues.push({ problem: "invalid-value", detail: `${name}="${value}"` });
        }
      }
    });
    const details = { url, issues: issues.slice(0, 25), total: issues.length };
    if (issues.length > 0) {
      return fail(
        "a11y-aria-valid",
        `${issues.length} invalid ARIA role(s) or attribute(s) found \u2014 these are ignored by assistive technology`,
        details
      );
    }
    return pass("a11y-aria-valid", "ARIA roles and attributes are valid", details);
  }
});
