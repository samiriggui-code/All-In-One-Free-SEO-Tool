import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { findItemsByType, getMissingFields, hasField } from "@/audit/rules/schema/utils";

export const PRODUCT_TYPES = ["Product", "ProductGroup"];
export const REQUIRED4 = ["name", "image"];
export const RECOMMENDED4 = ["description", "brand", "sku", "gtin", "aggregateRating", "review"];
export const OFFER_REQUIRED = ["price", "priceCurrency", "availability"];
export const structuredDataProductRule = defineRule({
  id: "schema-product",
  name: "Product Schema",
  description: "Validates Product schema for e-commerce rich results",
  category: "schema",
  weight: 12,
  run: (context) => {
    const { $ } = context;
    const products = findItemsByType($, PRODUCT_TYPES);
    if (products.length === 0) {
      return pass("schema-product", "No Product schema found (not required)", {
        found: false
      });
    }
    const issues = [];
    const warnings = [];
    for (const product of products) {
      const missing = getMissingFields(product, REQUIRED4);
      if (missing.length > 0) {
        issues.push(`Product missing: ${missing.join(", ")}`);
      }
      if (hasField(product, "offers")) {
        const offers = product.data.offers;
        const offerList = Array.isArray(offers) ? offers : [offers];
        for (const offer of offerList) {
          if (typeof offer !== "object" || offer === null) continue;
          const o = offer;
          for (const field of OFFER_REQUIRED) {
            if (!o[field]) {
              issues.push(`Offer missing ${field}`);
            }
          }
          if (o.availability) {
            const validAvailability = [
              "InStock",
              "OutOfStock",
              "PreOrder",
              "BackOrder",
              "https://schema.org/InStock",
              "https://schema.org/OutOfStock",
              "https://schema.org/PreOrder",
              "https://schema.org/BackOrder"
            ];
            const avail = String(o.availability);
            const isValid = validAvailability.some((v) => avail.includes(v.replace("https://schema.org/", "")));
            if (!isValid) {
              warnings.push("availability should use schema.org ItemAvailability values");
            }
          }
        }
      } else {
        issues.push("Product missing offers (required for rich results)");
      }
      const missingRecommended = getMissingFields(product, RECOMMENDED4);
      if (missingRecommended.length > 0) {
        warnings.push(`consider adding ${missingRecommended.join(", ")}`);
      }
    }
    if (issues.length > 0) {
      return fail("schema-product", issues.slice(0, 3).join("; "), {
        productCount: products.length,
        issues,
        warnings
      });
    }
    if (warnings.length > 0) {
      return warn("schema-product", "Product schema valid with suggestions", {
        productCount: products.length,
        warnings
      });
    }
    return pass("schema-product", `${products.length} Product schema(s) properly configured`, {
      productCount: products.length
    });
  }
});
