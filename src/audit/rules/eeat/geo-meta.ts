import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { findItemsByType } from "@/audit/rules/schema/utils";

export const LOCAL_TYPES2 = ["LocalBusiness", "Restaurant", "Store", "Dentist", "Physician", "Hotel"];
export const GEO_META = ["geo.region", "geo.placename", "geo.position", "icbm"];
export const geoMetaRule = defineRule({
  id: "eeat-geo-meta",
  name: "Geo Meta Tags",
  description: "Checks that a page with local-business schema also sets a geo meta tag",
  category: "eeat",
  weight: 2,
  run: (context) => {
    const local = findItemsByType(context.$, LOCAL_TYPES2);
    const present = GEO_META.filter((name) => context.$(`meta[name="${name}" i]`).length > 0);
    if (local.length === 0) {
      return pass("eeat-geo-meta", "No local-business schema, so geo meta tags are not required", {
        local: false,
        present
      });
    }
    if (present.length > 0) {
      return pass("eeat-geo-meta", `Geo meta present: ${present.join(", ")}`, {
        local: true,
        present
      });
    }
    return warn("eeat-geo-meta", "Local-business schema is present and no geo meta tag was found", {
      local: true,
      present,
      recommendation: "Add meta tags for geo.region, geo.placename, or geo.position on pages that describe a place."
    });
  }
});
