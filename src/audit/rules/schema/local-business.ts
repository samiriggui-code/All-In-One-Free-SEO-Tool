import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { findItemsByType, getMissingFields, hasField } from "@/audit/rules/schema/utils";

export const LOCAL_TYPES = [
  "LocalBusiness",
  "Restaurant",
  "Store",
  "MedicalBusiness",
  "LegalService",
  "FinancialService",
  "RealEstateAgent",
  "Dentist",
  "Physician",
  "Attorney"
];
export const REQUIRED2 = ["name", "address"];
export const RECOMMENDED2 = [
  "telephone",
  "openingHours",
  "geo",
  "priceRange",
  "image",
  "url"
];
export const structuredDataLocalBusinessRule = defineRule({
  id: "schema-local-business",
  name: "LocalBusiness Schema",
  description: "Validates LocalBusiness, Restaurant, Store, and other local business schemas for required and recommended fields",
  category: "schema",
  weight: 10,
  run: async (context) => {
    const { $ } = context;
    const businesses = findItemsByType($, LOCAL_TYPES);
    if (businesses.length === 0) {
      return pass(
        "schema-local-business",
        "No LocalBusiness schema found (not required)",
        { businessesFound: 0 }
      );
    }
    const issues = [];
    const warnings = [];
    for (const business of businesses) {
      const businessType = business.type;
      const missingRequired = getMissingFields(business, REQUIRED2);
      if (missingRequired.length > 0) {
        issues.push(
          `${businessType}: missing required fields: ${missingRequired.join(", ")}`
        );
      }
      if (hasField(business, "address")) {
        const address = business.data.address;
        if (typeof address === "string") {
          warnings.push(
            `${businessType}: address should be PostalAddress object, not string`
          );
        } else if (address && typeof address === "object") {
          const addressObj = address;
          const missingAddressFields = [];
          if (!addressObj.streetAddress) {
            missingAddressFields.push("streetAddress");
          }
          if (!addressObj.addressLocality) {
            missingAddressFields.push("addressLocality");
          }
          if (missingAddressFields.length > 0) {
            warnings.push(
              `${businessType}: address missing fields: ${missingAddressFields.join(", ")}`
            );
          }
        }
      }
      if (hasField(business, "geo")) {
        const geo = business.data.geo;
        if (geo && typeof geo === "object") {
          const geoObj = geo;
          const missingGeoFields = [];
          if (geoObj.latitude === void 0 || geoObj.latitude === null) {
            missingGeoFields.push("latitude");
          }
          if (geoObj.longitude === void 0 || geoObj.longitude === null) {
            missingGeoFields.push("longitude");
          }
          if (missingGeoFields.length > 0) {
            warnings.push(
              `${businessType}: geo missing fields: ${missingGeoFields.join(", ")}`
            );
          }
        }
      }
      const missingRecommended = getMissingFields(business, RECOMMENDED2);
      if (missingRecommended.length > 0) {
        warnings.push(
          `${businessType}: missing recommended fields: ${missingRecommended.join(", ")}`
        );
      }
    }
    if (issues.length > 0) {
      return fail(
        "schema-local-business",
        `LocalBusiness schema validation failed: ${issues.join("; ")}`,
        {
          businessesFound: businesses.length,
          issues,
          warnings
        }
      );
    }
    if (warnings.length > 0) {
      return warn(
        "schema-local-business",
        `LocalBusiness schema has warnings: ${warnings.join("; ")}`,
        {
          businessesFound: businesses.length,
          warnings
        }
      );
    }
    return pass(
      "schema-local-business",
      `All ${businesses.length} LocalBusiness schema(s) have required fields`,
      {
        businessesFound: businesses.length,
        businessTypes: businesses.map((b) => b.type)
      }
    );
  }
});
