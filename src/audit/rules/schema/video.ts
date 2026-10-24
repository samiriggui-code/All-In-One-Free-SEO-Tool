import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { findItemsByType, getMissingFields, hasField } from "@/audit/rules/schema/utils";

export const REQUIRED5 = ["name", "thumbnailUrl", "uploadDate"];
export const RECOMMENDED5 = ["description", "contentUrl", "duration", "embedUrl", "interactionStatistic"];
export const structuredDataVideoRule = defineRule({
  id: "schema-video",
  name: "Video Schema",
  description: "Validates VideoObject schema for video rich results",
  category: "schema",
  weight: 10,
  run: (context) => {
    const { $ } = context;
    const videos = findItemsByType($, "VideoObject");
    if (videos.length === 0) {
      return pass("schema-video", "No VideoObject schema found (not required)", {
        found: false
      });
    }
    const issues = [];
    const warnings = [];
    for (const video of videos) {
      const missing = getMissingFields(video, REQUIRED5);
      if (missing.length > 0) {
        issues.push(`VideoObject missing: ${missing.join(", ")}`);
      }
      if (hasField(video, "thumbnailUrl")) {
        const thumb = video.data.thumbnailUrl;
        if (typeof thumb === "string" && !thumb.startsWith("http")) {
          warnings.push("thumbnailUrl should be absolute URL");
        }
      }
      if (hasField(video, "duration")) {
        const dur = video.data.duration;
        if (typeof dur === "string" && !dur.startsWith("PT")) {
          warnings.push("duration should be ISO 8601 format (e.g., PT1M30S)");
        }
      }
      if (hasField(video, "uploadDate")) {
        const date = video.data.uploadDate;
        if (typeof date === "string" && !/^\d{4}-\d{2}-\d{2}/.test(date)) {
          warnings.push("uploadDate should be ISO 8601 date format");
        }
      }
      const missingRecommended = getMissingFields(video, RECOMMENDED5);
      if (missingRecommended.length > 0) {
        warnings.push(`consider adding ${missingRecommended.join(", ")}`);
      }
    }
    if (issues.length > 0) {
      return fail("schema-video", issues.join("; "), {
        videoCount: videos.length,
        issues,
        warnings
      });
    }
    if (warnings.length > 0) {
      return warn("schema-video", "VideoObject valid with suggestions", {
        videoCount: videos.length,
        warnings
      });
    }
    return pass("schema-video", `${videos.length} VideoObject schema(s) properly configured`, {
      videoCount: videos.length
    });
  }
});
