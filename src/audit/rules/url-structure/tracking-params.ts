import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const TRACKING_PARAMS = /* @__PURE__ */ new Set([
  // Google Analytics / Ads
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  // Google Ads
  "gclid",
  "gclsrc",
  "dclid",
  "wbraid",
  "gbraid",
  // Facebook / Meta
  "fbclid",
  "fb_action_ids",
  "fb_action_types",
  "fb_source",
  // Microsoft Ads
  "msclkid",
  // Mailchimp
  "mc_cid",
  "mc_eid",
  // HubSpot
  "_hsenc",
  "_hsmi",
  "__hstc",
  "__hsfp",
  "hsCtaTracking",
  // Other common trackers
  "ref",
  "affiliate_id",
  "zanpid",
  "spm"
]);
export const trackingParamsRule = defineRule({
  id: "url-tracking-params",
  name: "Tracking Parameters in URL",
  description: "Checks for common tracking parameters (UTM, gclid, fbclid, etc.) that create duplicate URL variations",
  category: "url",
  weight: 5,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      const foundTrackers = [];
      for (const key of params.keys()) {
        const lowerKey = key.toLowerCase();
        if (TRACKING_PARAMS.has(lowerKey)) {
          foundTrackers.push(key);
        }
      }
      if (foundTrackers.length === 0) {
        return pass(
          "url-tracking-params",
          "No tracking parameters found in URL",
          { url }
        );
      }
      return warn(
        "url-tracking-params",
        `URL contains ${foundTrackers.length} tracking parameter(s): ${foundTrackers.join(", ")}`,
        {
          url,
          trackingParameters: foundTrackers,
          trackingParameterCount: foundTrackers.length,
          fix: "Use canonical tags to point to the clean URL without tracking parameters"
        }
      );
    } catch {
      return pass("url-tracking-params", "Could not parse URL", { url });
    }
  }
});
